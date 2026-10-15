import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import { User } from '../models/user.model.js';

/**
 * Extracts JWT token from cookie or Authorization header
 * Primary source is HTTP-only cookie
 * @param {import('express').Request} req
 * @returns {string|null}
 */
export function extractToken(req) {
  if (req.cookies && req.cookies[env.COOKIE_NAME]) {
    return req.cookies[env.COOKIE_NAME];
  }

  // Optional bearer fallback for external HTTP clients/curl
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * Verifies JWT token and enforces explicit algorithm
 * @param {string} token
 * @returns {object} decoded claims
 */
export function verifyJwtToken(token) {
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: [env.JWT_ALGORITHM],
  });
}

/**
 * JWT Authentication Middleware
 * Protects endpoints by verifying cookie/bearer JWT and attaching safe user to req.user
 */
export async function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return next(
      new AppError('Authentication required: no active session found', 401, 'UNAUTHORIZED')
    );
  }

  let decoded;
  try {
    decoded = verifyJwtToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(
        new AppError('Authentication expired: please log in again', 401, 'TOKEN_EXPIRED')
      );
    }
    return next(
      new AppError('Authentication invalid: malformed or untrusted token', 401, 'INVALID_TOKEN')
    );
  }

  const userId = decoded.sub || decoded.id;
  if (!userId) {
    return next(
      new AppError('Authentication invalid: token missing subject claim', 401, 'INVALID_TOKEN')
    );
  }

  try {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return next(
        new AppError('User session invalid: account no longer exists', 401, 'USER_NOT_FOUND')
      );
    }

    // Attach safe user identity to request object
    req.user = user.toSafeObject ? user.toSafeObject() : {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    next();
  } catch (dbErr) {
    // Database query failure should produce 500, not 401
    return next(
      new AppError(`Database error during authentication: ${dbErr.message}`, 500, 'DATABASE_ERROR')
    );
  }
}
