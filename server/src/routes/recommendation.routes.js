import { Router } from 'express';
import { getRecommendedIssues } from '../controllers/recommendation.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { recommendationsRateLimiter } from '../middleware/rate-limit.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

// All recommendation endpoints require authentication to derive user preferences
router.use(requireAuth);

// GET /api/v1/recommendations/issues — personalized issue suggestions (rate limited)
router.get('/issues', recommendationsRateLimiter, asyncHandler(getRecommendedIssues));

export default router;
