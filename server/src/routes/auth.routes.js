import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  authRateLimiter,
  reauthRateLimiter,
  oauthStartRateLimiter,
} from '../middleware/rate-limit.middleware.js';

const router = Router();

/**
 * Public Authentication Endpoints (Rate limited against credential brute forcing)
 */
router.post('/register', authRateLimiter, asyncHandler(authController.register));
router.post('/login', authRateLimiter, asyncHandler(authController.login));

/**
 * Protected Endpoints
 */
router.get('/me', requireAuth, asyncHandler(authController.getMe));

/**
 * Reauthentication Endpoint (Protected, strictly rate limited)
 * Obtains single-use ticket for sensitive identity operations
 */
router.post('/reauth', requireAuth, reauthRateLimiter, asyncHandler(authController.reauthenticate));

/**
 * GitHub App OAuth Endpoints
 */
router.get('/github', oauthStartRateLimiter, asyncHandler(authController.initiateGitHubAuth));
router.get('/github/callback', asyncHandler(authController.handleGitHubCallback));
router.delete('/github', requireAuth, asyncHandler(authController.unlinkGitHub));

/**
 * Logout Endpoint
 * Allows clearing auth cookie safely
 */
router.post('/logout', asyncHandler(authController.logout));

export default router;
