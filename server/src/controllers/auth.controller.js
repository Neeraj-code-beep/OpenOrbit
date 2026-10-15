import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { env, getAuthCookieOptions, getClearCookieOptions } from '../config/env.js';
import { AppError } from '../utils/app-error.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
