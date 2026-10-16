import { Router } from 'express';
import {
  generateContributionPlan,
  getAIStatus,
  analyzeIssue,
  analyzeCode,
  getRepositoryContext,
} from '../controllers/ai.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateContributionPlanBody } from '../validators/contribution.validator.js';
import { aiPlanRateLimiter } from '../middleware/rate-limit.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

// GET /api/ai/status - Providers health and status
router.get('/status', asyncHandler(getAIStatus));

// POST /api/ai/contribution-plan - Generate structured plan (Rate limited)
router.post(
  '/contribution-plan',
  aiPlanRateLimiter,
  validate(validateContributionPlanBody, 'body'),
  asyncHandler(generateContributionPlan)
);

// POST /api/ai/analyze-issue - Python issue breakdown
router.post('/analyze-issue', asyncHandler(analyzeIssue));

// POST /api/ai/analyze-code - Python structural code analysis
router.post('/analyze-code', asyncHandler(analyzeCode));

// POST /api/ai/repository-context - Python architecture & context summary
router.post('/repository-context', asyncHandler(getRepositoryContext));

export default router;

