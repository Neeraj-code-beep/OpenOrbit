import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * Public Authentication Endpoints
 */
router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));

/**
 * Protected Endpoints
 */
router.get('/me', requireAuth, asyncHandler(authController.getMe));

/**
 * Logout Endpoint
 * Allows clearing auth cookie safely
 */
router.post('/logout', asyncHandler(authController.logout));

export default router;
