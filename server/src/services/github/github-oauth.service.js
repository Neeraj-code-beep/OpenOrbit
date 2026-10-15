import { AppError } from '../../utils/app-error.js';
import {
  encryptToken,
  decryptToken,
  generatePkceChallenge,
  generateOauthState,
  hashReauthTicket,
} from '../../utils/crypto.utils.js';
import { User } from '../../models/user.model.js';
import { env } from '../../config/env.js';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_API = 'https://api.github.com/user';
const GITHUB_EMAILS_API = 'https://api.github.com/user/emails';

const USER_AGENT = 'OpenOrbit-Contribution-Assistant/1.0';
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Validates and sanitizes post-auth redirect destinations to prevent open redirects
 * @param {string} [destination]
 * @returns {string} Safe relative path or client origin
 */
export function sanitizeRedirectDestination(destination) {
  if (!destination || typeof destination !== 'string') {
    return '/';
  }
  const trimmed = destination.trim();
  // Allow safe relative paths (starts with / but not // to prevent protocol-relative open redirects)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) {
    return trimmed;
  }
  // Allow exact client origin match
  try {
    const url = new URL(trimmed);
    const clientUrl = new URL(env.CLIENT_ORIGIN);
    if (url.origin === clientUrl.origin) {
      return url.pathname + url.search;
    }
  } catch {
    // Malformed URL falls back to default
  }
  return '/';
}

/**
 * Creates OAuth initiation state, PKCE challenge, and encrypted state package for cookie storage
 *
 * @param {object} params
 * @param {'auth'|'link'} [params.intent='auth']
 * @param {string|null} [params.userId=null]
 * @param {string|null} [params.reauthTicket=null]
 * @param {string} [params.redirectTo='/']
 * @param {string} [params.encryptionKey]
 * @returns {{ authorizationUrl: string, encryptedStateCookie: string }}
 */
export function initiateGitHubOAuth({
  intent = 'auth',
  userId = null,
  reauthTicket = null,
  redirectTo = '/',
  encryptionKey = env.GITHUB_ENCRYPTION_KEY,
} = {}) {
  if (!env.GITHUB_APP_CLIENT_ID || !env.GITHUB_APP_CLIENT_SECRET) {
    throw new AppError(
      'GitHub App authentication is not configured on this server.',
      503,
      'GITHUB_AUTH_NOT_CONFIGURED'
    );
  }

  if (!encryptionKey) {
    throw new AppError(
      'Server token encryption key is missing or unconfigured.',
      500,
      'CRYPTO_KEY_MISSING'
    );
  }

  const state = generateOauthState();
  const pkce = generatePkceChallenge();
  const safeRedirect = sanitizeRedirectDestination(redirectTo);

  const payload = {
    state,
    codeVerifier: pkce.codeVerifier,
    intent,
    userId: intent === 'link' ? userId : null,
    reauthTicket: intent === 'link' ? reauthTicket : null,
    redirectTo: safeRedirect,
    createdAt: Date.now(),
  };

  const encryptedStateCookie = encryptToken(JSON.stringify(payload), encryptionKey);

  const authUrl = new URL(GITHUB_AUTH_URL);
  authUrl.searchParams.set('client_id', env.GITHUB_APP_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', env.GITHUB_APP_CALLBACK_URL);
  authUrl.searchParams.set('scope', 'read:user,user:email');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', pkce.codeChallenge);
  authUrl.searchParams.set('code_challenge_method', pkce.method);

  return {
    authorizationUrl: authUrl.toString(),
    encryptedStateCookie,
  };
}

/**
 * Validates the OAuth state cookie against the callback state parameter and checks expiration
 *
 * @param {string} stateParam - state from req.query
 * @param {string} encryptedStateCookie - encrypted cookie value
 * @param {string} [encryptionKey]
 * @returns {object} Unpacked validated transaction payload
 */
export function validateOAuthState(
  stateParam,
  encryptedStateCookie,
  encryptionKey = env.GITHUB_ENCRYPTION_KEY
) {
  if (!stateParam || typeof stateParam !== 'string') {
    throw new AppError('Missing OAuth state parameter', 400, 'INVALID_OAUTH_STATE');
  }

  if (!encryptedStateCookie || typeof encryptedStateCookie !== 'string') {
    throw new AppError('Missing OAuth state session cookie', 400, 'MISSING_OAUTH_STATE_COOKIE');
  }

  let decryptedJson;
  try {
    decryptedJson = decryptToken(encryptedStateCookie, encryptionKey);
  } catch (err) {
    throw new AppError(
      'Invalid or tampered OAuth state session cookie',
      400,
      'INVALID_OAUTH_STATE_COOKIE'
    );
  }

  let payload;
  try {
    payload = JSON.parse(decryptedJson);
  } catch {
    throw new AppError('Corrupted OAuth state payload structure', 400, 'CORRUPTED_OAUTH_STATE');
  }

  // Verify state matches
  if (!payload.state || payload.state !== stateParam) {
    throw new AppError(
      'OAuth state mismatch (potential CSRF attempt or session expired)',
      403,
      'OAUTH_STATE_MISMATCH'
    );
  }

  // Verify not expired
  const ageMs = Date.now() - (payload.createdAt || 0);
  if (ageMs > OAUTH_STATE_MAX_AGE_MS || ageMs < 0) {
    throw new AppError('OAuth authorization session expired. Please try again.', 400, 'OAUTH_STATE_EXPIRED');
  }

  return payload;
}

/**
 * Exchanges authorization code and PKCE code_verifier for GitHub tokens
 *
 * @param {object} params
 * @param {string} params.code
 * @param {string} params.codeVerifier
 * @param {number} [params.timeoutMs=12000]
 * @returns {Promise<{ access_token: string, refresh_token?: string, expires_in?: number, refresh_token_expires_in?: number, token_type: string, scope?: string }>}
 */
export async function exchangeCodeForTokens({
  code,
  codeVerifier,
  timeoutMs = 12000,
}) {
  if (!code) {
    throw new AppError('Authorization code is required', 400, 'MISSING_AUTH_CODE');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify({
        client_id: env.GITHUB_APP_CLIENT_ID,
        client_secret: env.GITHUB_APP_CLIENT_SECRET,
        code,
        redirect_uri: env.GITHUB_APP_CALLBACK_URL,
        code_verifier: codeVerifier,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new AppError(
        `GitHub token exchange failed with HTTP ${res.status}`,
        res.status >= 500 ? 502 : 400,
        'GITHUB_TOKEN_EXCHANGE_FAILED'
      );
    }

    const data = await res.json();
    if (data.error) {
      throw new AppError(
        `GitHub token exchange error: ${data.error_description || data.error}`,
        400,
        'GITHUB_TOKEN_EXCHANGE_ERROR',
        { error: data.error }
      );
    }

    if (!data.access_token) {
      throw new AppError('GitHub response missing access_token', 502, 'INVALID_TOKEN_RESPONSE');
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new AppError('GitHub token exchange timed out after 12s', 504, 'GITHUB_TIMEOUT');
    }
    if (err instanceof AppError) throw err;
    throw new AppError(`GitHub token exchange network error: ${err.message}`, 502, 'GITHUB_NETWORK_ERROR');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches authenticated user's profile and verified primary email from GitHub API
 *
 * @param {string} accessToken
 * @param {number} [timeoutMs=10000]
 * @returns {Promise<{ id: string, login: string, name: string|null, email: string|null, avatarUrl: string|null, profileUrl: string|null }>}
 */
export async function fetchGitHubUser(accessToken, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const userRes = await fetch(GITHUB_USER_API, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': USER_AGENT,
      },
      signal: controller.signal,
    });

    if (!userRes.ok) {
      throw new AppError('Failed to fetch user profile from GitHub', userRes.status >= 500 ? 502 : 401, 'GITHUB_USER_FETCH_FAILED');
    }

    const userData = await userRes.json();
    if (!userData.id) {
      throw new AppError('GitHub user profile missing numeric ID', 502, 'INVALID_GITHUB_USER');
    }

    let email = userData.email || null;

    // If email is missing or private, query the user/emails endpoint
    if (!email) {
      try {
        const emailsRes = await fetch(GITHUB_EMAILS_API, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': USER_AGENT,
          },
          signal: controller.signal,
        });

        if (emailsRes.ok) {
          const emails = await emailsRes.json();
          if (Array.isArray(emails)) {
            // Find verified primary email
            const primary = emails.find((e) => e.primary && e.verified);
            if (primary) {
              email = primary.email;
            } else {
              const anyVerified = emails.find((e) => e.verified);
              if (anyVerified) email = anyVerified.email;
            }
          }
        }
      } catch {
        // Fallback: continue with null email
      }
    }

    return {
      id: String(userData.id),
      login: userData.login,
      name: userData.name || userData.login,
      email: email ? email.toLowerCase().trim() : null,
      avatarUrl: userData.avatar_url || null,
      profileUrl: userData.html_url || null,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new AppError('GitHub API request timed out', 504, 'GITHUB_TIMEOUT');
    }
    if (err instanceof AppError) throw err;
    throw new AppError(`GitHub user fetch error: ${err.message}`, 502, 'GITHUB_NETWORK_ERROR');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Atomically links a GitHub identity to an existing authenticated user after consuming single-use reauth ticket
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.reauthTicket
 * @param {object} params.ghProfile
 * @param {object} params.tokenData
 * @param {string} [params.encryptionKey]
 * @returns {Promise<User>} Updated user document
 */
export async function linkGitHubAccount({
  userId,
  reauthTicket,
  ghProfile,
  tokenData,
  encryptionKey = env.GITHUB_ENCRYPTION_KEY,
}) {
  if (!userId) {
    throw new AppError('User session required for account linking', 401, 'UNAUTHORIZED');
  }

  if (!encryptionKey) {
    throw new AppError('Server token encryption key is missing or unconfigured', 500, 'CRYPTO_KEY_MISSING');
  }

  if (!reauthTicket || typeof reauthTicket !== 'string') {
    throw new AppError(
      'Reauthentication ticket is required to link a GitHub account. Please reauthenticate first.',
      403,
      'REAUTH_REQUIRED'
    );
  }

  // Check if GitHub ID is already bound to another user account
  const conflictingUser = await User.findOne({ githubId: ghProfile.id });
  if (conflictingUser && conflictingUser._id.toString() !== userId) {
    throw new AppError(
      'This GitHub account is already linked to a different OpenOrbit user.',
      409,
      'GITHUB_ACCOUNT_ALREADY_LINKED'
    );
  }

  const ticketHash = hashReauthTicket(reauthTicket);
  const now = new Date();

  const encryptedAccessToken = encryptToken(tokenData.access_token, encryptionKey);
  const encryptedRefreshToken = tokenData.refresh_token
    ? encryptToken(tokenData.refresh_token, encryptionKey)
    : undefined;

  const updateFields = {
    reauthTicketHash: null,
    reauthTicketExpiresAt: null,
    githubId: ghProfile.id,
    githubUsername: ghProfile.login,
    githubAvatarUrl: ghProfile.avatarUrl,
    githubProfileUrl: ghProfile.profileUrl,
    githubAccessTokenEncrypted: encryptedAccessToken,
    githubKeyVersion: 'v1',
    githubScopes: tokenData.scope ? tokenData.scope.split(',').map((s) => s.trim()) : [],
  };

  if (encryptedRefreshToken) {
    updateFields.githubRefreshTokenEncrypted = encryptedRefreshToken;
  }
  if (tokenData.expires_in) {
    updateFields.githubTokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
  }
  if (tokenData.refresh_token_expires_in) {
    updateFields.githubRefreshTokenExpiresAt = new Date(Date.now() + tokenData.refresh_token_expires_in * 1000);
  }

  // Atomic single-use ticket consumption and linking in one DB operation
  let user;
  try {
    user = await User.findOneAndUpdate(
      {
        _id: userId,
        reauthTicketHash: ticketHash,
        reauthTicketExpiresAt: { $gt: now },
      },
      {
        $set: updateFields,
        $inc: { githubTokenVersion: 1 },
        $addToSet: { authProviders: 'github' },
      },
      { new: true }
    );
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError(
        'This GitHub account is already linked to another user.',
        409,
        'GITHUB_ACCOUNT_ALREADY_LINKED'
      );
    }
    throw err;
  }

  if (!user) {
    // Determine reason for failure
    const existing = await User.findById(userId);
    if (!existing) {
      throw new AppError('User account not found', 404, 'USER_NOT_FOUND');
    }
    throw new AppError(
      'Reauthentication ticket is invalid, expired, or has already been used.',
      403,
      'REAUTH_TICKET_INVALID'
    );
  }

  return user;
}

/**
 * Handles GitHub sign-in or new GitHub-only account registration
 *
 * @param {object} params
 * @param {object} params.ghProfile
 * @param {object} params.tokenData
 * @param {string} [params.encryptionKey]
 * @returns {Promise<{ user: User, isNewUser: boolean }>}
 */
export async function authenticateWithGitHub({
  ghProfile,
  tokenData,
  encryptionKey = env.GITHUB_ENCRYPTION_KEY,
}) {
  if (!encryptionKey) {
    throw new AppError('Server token encryption key is missing or unconfigured', 500, 'CRYPTO_KEY_MISSING');
  }

  const encryptedAccessToken = encryptToken(tokenData.access_token, encryptionKey);
  const encryptedRefreshToken = tokenData.refresh_token
    ? encryptToken(tokenData.refresh_token, encryptionKey)
    : undefined;

  // 1. Existing user with this GitHub ID?
  let user = await User.findOne({ githubId: ghProfile.id });

  if (user) {
    // Existing GitHub user: update profile and refreshed tokens
    user.githubUsername = ghProfile.login;
    user.githubAvatarUrl = ghProfile.avatarUrl;
    user.githubProfileUrl = ghProfile.profileUrl;
    user.githubAccessTokenEncrypted = encryptedAccessToken;
    if (encryptedRefreshToken) {
      user.githubRefreshTokenEncrypted = encryptedRefreshToken;
    }
    if (tokenData.expires_in) {
      user.githubTokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    }
    if (tokenData.refresh_token_expires_in) {
      user.githubRefreshTokenExpiresAt = new Date(Date.now() + tokenData.refresh_token_expires_in * 1000);
    }
    user.githubTokenVersion = (user.githubTokenVersion || 0) + 1;
    await user.save();

    return { user, isNewUser: false };
  }

  // 2. No user with this githubId. Check email to prevent silent account hijacking
  const cleanLogin = (ghProfile.login || 'user').replace(/[^a-zA-Z0-9-]/g, '').toLowerCase() || 'user';
  const emailCandidate = ghProfile.email || `${cleanLogin}@users.noreply.github.com`;

  const existingByEmail = await User.findOne({ email: emailCandidate });
  if (existingByEmail) {
    // Non-negotiable security rule: NEVER silently link accounts solely because emails match!
    throw new AppError(
      'An OpenOrbit account already exists with this email address. Please log in with your password and connect your GitHub account from Settings.',
      409,
      'ACCOUNT_EXISTS_REQUIRES_LINK'
    );
  }

  // 3. Create new GitHub-only user
  try {
    user = await User.create({
      name: ghProfile.name || ghProfile.login,
      email: emailCandidate,
      password: null, // Allowed by schema for authProviders: ['github']
      authProviders: ['github'],
      githubId: ghProfile.id,
      githubUsername: ghProfile.login,
      githubAvatarUrl: ghProfile.avatarUrl,
      githubProfileUrl: ghProfile.profileUrl,
      githubAccessTokenEncrypted: encryptedAccessToken,
      githubRefreshTokenEncrypted: encryptedRefreshToken,
      githubTokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
      githubRefreshTokenExpiresAt: tokenData.refresh_token_expires_in ? new Date(Date.now() + tokenData.refresh_token_expires_in * 1000) : null,
      githubKeyVersion: 'v1',
      githubScopes: tokenData.scope ? tokenData.scope.split(',').map((s) => s.trim()) : [],
      githubTokenVersion: 1,
    });
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError(
        'An account with this email or GitHub ID already exists.',
        409,
        'ACCOUNT_CONFLICT'
      );
    }
    throw err;
  }

  return { user, isNewUser: true };
}

/**
 * Retrieves and decrypts the GitHub access token for an authenticated user
 * Used internally by backend services to make authorized GitHub queries
 *
 * @param {string} userId
 * @param {string} [encryptionKey]
 * @returns {Promise<string|null>} Decrypted plaintext access token or null if unlinked
 */
export async function getUserGitHubToken(userId, encryptionKey = env.GITHUB_ENCRYPTION_KEY) {
  if (!userId) return null;

  const user = await User.findById(userId).select('+githubAccessTokenEncrypted');
  if (!user || !user.githubAccessTokenEncrypted) {
    return null;
  }

  if (!encryptionKey) {
    throw new AppError('Server token encryption key is missing or unconfigured', 500, 'CRYPTO_KEY_MISSING');
  }

  try {
    return decryptToken(user.githubAccessTokenEncrypted, encryptionKey);
  } catch (err) {
    // If token fails to decrypt, do not leak crypto error to caller
    return null;
  }
}
