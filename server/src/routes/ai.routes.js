import { Router } from 'express';
import { generateContributionPlan, getAIStatus } from '../controllers/ai.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateContributionPlanBody } from '../validators/contribution.validator.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

// GET /api/ai/status - Providers health and status
router.get('/status', asyncHandler(getAIStatus));

// POST /api/ai/contribution-plan - Generate structured plan
router.post(
  '/contribution-plan',
  validate(validateContributionPlanBody, 'body'),
  asyncHandler(generateContributionPlan)
);

export default router;
