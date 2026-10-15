import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { env, getAuthCookieOptions, getClearCookieOptions } from '../config/env.js';
import { AppError } from '../utils/app-error.js';

import { extractToken, verifyJwtToken } from '../middleware/auth.middleware.js';
import { createReauthTicket } from '../utils/crypto.utils.js';
import {
  initiateGitHubOAuth,
  validateOAuthState,
  exchangeCodeForTokens,
  fetchGitHubUser,
  linkGitHubAccount,
  authenticateWithGitHub,
} from '../services/github/github-oauth.service.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OAUTH_STATE_COOKIE = 'openorbit_oauth_state';

/**
 * Validates registration input payload
 * @param {{ name?: string, email?: string, password?: string }} body
 * @returns {string[]} list of validation errors
 */
function validateRegisterInput(body) {
  const errors = [];
  const { name, email, password } = body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  } else if (name.trim().length > 60) {
    errors.push('Name cannot exceed 60 characters');
  }

  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    errors.push('A valid email address is required');
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      errors.push('Password must contain at least one letter and one number');
    }
  }

  return errors;
}

/**
 * Generates signed JWT token for a user
 * @param {string} userId
 * @param {string} email
 * @returns {string}
 */
export function generateToken(userId, email) {
  return jwt.sign(
    {
      sub: userId,
      email,
    },
    env.JWT_SECRET,
    {
      algorithm: env.JWT_ALGORITHM,
      expiresIn: env.JWT_EXPIRES_IN,
    }
  );
}

/**
 * POST /api/v1/auth/register
 * Registers a new user, hashes password, sets auth cookie, and returns safe user profile
 */
export async function register(req, res) {
  const { name, email, password } = req.body || {};

  // 1. Validate inputs
  const validationErrors = validateRegisterInput(req.body);
  if (validationErrors.length > 0) {
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', validationErrors);
  }

  const normalizedEmail = email.trim().toLowerCase();

  // 2. Check for duplicate email
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError('An account with this email address already exists', 409, 'EMAIL_ALREADY_EXISTS');
  }

  // 3. Create user (password is hashed in pre-save hook)
  let user;
  try {
    user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
    });
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError('An account with this email address already exists', 409, 'EMAIL_ALREADY_EXISTS');
    }
    throw err;
  }

  // 4. Generate token and set HTTP-only cookie
  const token = generateToken(user._id.toString(), user.email);
  res.cookie(env.COOKIE_NAME, token, getAuthCookieOptions());

  // 5. Return safe user object (no password hash)
  const safeUser = user.toSafeObject();

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: safeUser,
    },
  });
}

/**
 * POST /api/v1/auth/login
 * Validates credentials, sets HTTP-only cookie, and returns safe user profile
 */
export async function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR', ['Email and password are required']);
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Find user by normalized email and explicitly select password hash
  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  if (!user) {
    // Return generic error message to prevent account enumeration
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Verify bcrypt password hash
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Generate token and set HTTP-only cookie
  const token = generateToken(user._id.toString(), user.email);
  res.cookie(env.COOKIE_NAME, token, getAuthCookieOptions());

  const safeUser = user.toSafeObject();

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: safeUser,
    },
  });
}

/**
 * GET /api/v1/auth/me
 * Returns authenticated user's safe profile
 */
export async function getMe(req, res) {
  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
  });
}

/**
 * POST /api/v1/auth/logout
 * Clears authentication cookie with matching options
 */
export async function logout(req, res) {
  res.clearCookie(env.COOKIE_NAME, getClearCookieOptions());

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
}

/**
 * Helper to get secure options for the temporary OAuth state cookie
 */
function getOAuthCookieOptions() {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax', // Required for standard OAuth redirect navigation
    path: '/',
    maxAge: 10 * 60 * 1000, // 10 minutes
  };
}

/**
 * POST /api/v1/auth/reauth
 * Issues a single-use, 5-minute reauthentication ticket upon verifying local password
 * Required before sensitive operations like linking a GitHub identity
 */
export async function reauthenticate(req, res) {
  const { password } = req.body || {};

  if (!password || typeof password !== 'string') {
    throw new AppError('Password is required for reauthentication', 400, 'VALIDATION_ERROR');
  }

  const userId = req.user?.id || req.user?._id;
  if (!userId) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  // Retrieve user with password
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (!user.password) {
    throw new AppError(
      'Account does not have a local password configured. Contact support or use provider sign-in.',
      400,
      'NO_LOCAL_PASSWORD'
    );
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid password', 401, 'INVALID_CREDENTIALS');
  }

  // Generate single-use ticket
  const ticketObj = createReauthTicket(5 * 60 * 1000); // 5 min TTL

  // Atomically persist ticket hash on user document
  user.reauthTicketHash = ticketObj.hash;
  user.reauthTicketExpiresAt = ticketObj.expiresAt;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Reauthentication successful. Use ticket within 5 minutes to link external identity.',
    data: {
      ticket: ticketObj.ticket,
      expiresAt: ticketObj.expiresAt,
    },
  });
}

/**
 * GET /api/v1/auth/github
 * Initiates GitHub App authorization code flow with state and PKCE
 * Query params:
 *   - link: 'true' (indicates intent to link to currently authenticated user)
 *   - ticket: string (reauth ticket required when link is 'true')
 *   - redirect_to: optional post-auth frontend destination
 */
export async function initiateGitHubAuth(req, res) {
  const isLinking = req.query.link === 'true' || req.query.link === '1';
  const ticket = req.query.ticket || null;
  const redirectTo = req.query.redirect_to || '/';

  let userId = null;
  if (isLinking) {
    // When linking, ensure current session is present
    userId = req.user?.id || req.user?._id;
    if (!userId) {
      const token = extractToken(req);
      if (!token) {
        throw new AppError('Must be logged in to link a GitHub account', 401, 'UNAUTHORIZED');
      }
      try {
        const decoded = verifyJwtToken(token);
        userId = decoded.sub || decoded.id;
      } catch {
        throw new AppError('Session expired or invalid. Please log in again.', 401, 'UNAUTHORIZED');
      }
    }
    if (!ticket) {
      throw new AppError('Reauthentication ticket is required to link GitHub account', 403, 'REAUTH_REQUIRED');
    }
  }

  const { authorizationUrl, encryptedStateCookie } = initiateGitHubOAuth({
    intent: isLinking ? 'link' : 'auth',
    userId,
    reauthTicket: ticket,
    redirectTo,
  });

  // Set encrypted state cookie
  res.cookie(OAUTH_STATE_COOKIE, encryptedStateCookie, getOAuthCookieOptions());

  // Redirect to GitHub authorization endpoint
  res.redirect(302, authorizationUrl);
}

/**
 * GET /api/v1/auth/github/callback
 * Handles OAuth callback from GitHub, exchanges code, verifies identity, and establishes session
 */
export async function handleGitHubCallback(req, res) {
  const { code, state, error, error_description } = req.query;
  const stateCookie = req.cookies?.[OAUTH_STATE_COOKIE];

  // Helper to safely redirect back to frontend on failure
  const failRedirect = (errorCode, errorMsg) => {
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/', httpOnly: true });
    const targetUrl = new URL(env.CLIENT_ORIGIN);
    targetUrl.searchParams.set('auth_error', errorCode || 'OAUTH_ERROR');
    targetUrl.searchParams.set('message', errorMsg || 'GitHub authentication failed');
    return res.redirect(302, targetUrl.toString());
  };

  // 1. Check for provider-level denial or errors
  if (error) {
    return failRedirect(
      error === 'access_denied' ? 'ACCESS_DENIED' : 'PROVIDER_ERROR',
      error_description || 'Authorization was denied by user or GitHub'
    );
  }

  // 2. Validate state cookie
  let oauthPayload;
  try {
    oauthPayload = validateOAuthState(state, stateCookie);
  } catch (err) {
    return failRedirect(err.code || 'INVALID_STATE', err.message);
  }

  // 3. Fail fast for link intent: Verify active session BEFORE exchanging code with GitHub
  if (oauthPayload.intent === 'link') {
    const sessionToken = extractToken(req);
    if (!sessionToken) {
      return failRedirect('UNAUTHORIZED', 'Active session required to link GitHub account');
    }

    let decoded;
    try {
      decoded = verifyJwtToken(sessionToken);
    } catch {
      return failRedirect('UNAUTHORIZED', 'Session expired during authorization. Please log in and retry.');
    }

    const activeUserId = decoded.sub || decoded.id;
    if (activeUserId !== oauthPayload.userId) {
      return failRedirect('SESSION_MISMATCH', 'Session user does not match the account-linking transaction');
    }
  }

  // 4. Exchange code for tokens
  let tokenData;
  try {
    tokenData = await exchangeCodeForTokens({
      code,
      codeVerifier: oauthPayload.codeVerifier,
    });
  } catch (err) {
    return failRedirect(err.code || 'TOKEN_EXCHANGE_FAILED', err.message);
  }

  // 5. Retrieve user profile from GitHub
  let ghProfile;
  try {
    ghProfile = await fetchGitHubUser(tokenData.access_token);
  } catch (err) {
    return failRedirect(err.code || 'PROFILE_FETCH_FAILED', err.message);
  }

  // 6. Route based on intent: 'link' vs 'auth'
  try {
    if (oauthPayload.intent === 'link') {
      // Link to existing user using atomic ticket consumption
      await linkGitHubAccount({
        userId: oauthPayload.userId,
        reauthTicket: oauthPayload.reauthTicket,
        ghProfile,
        tokenData,
      });

      // Clear state cookie
      res.clearCookie(OAUTH_STATE_COOKIE, { path: '/', httpOnly: true });

      // Redirect to target with linked indicator
      const successUrl = new URL(oauthPayload.redirectTo || '/', env.CLIENT_ORIGIN);
      successUrl.searchParams.set('github_linked', 'true');
      return res.redirect(302, successUrl.toString());
    } else {
      // Sign-in or registration
      const { user, isNewUser } = await authenticateWithGitHub({
        ghProfile,
        tokenData,
      });

      // Issue OpenOrbit JWT session
      const sessionToken = generateToken(user._id.toString(), user.email);
      res.cookie(env.COOKIE_NAME, sessionToken, getAuthCookieOptions());

      // Clear state cookie
      res.clearCookie(OAUTH_STATE_COOKIE, { path: '/', httpOnly: true });

      // Redirect to destination
      const successUrl = new URL(oauthPayload.redirectTo || '/', env.CLIENT_ORIGIN);
      successUrl.searchParams.set('auth_success', isNewUser ? 'registered' : 'logged_in');
      return res.redirect(302, successUrl.toString());
    }
  } catch (err) {
    return failRedirect(err.code || 'AUTH_PROCESSING_FAILED', err.message);
  }
}
