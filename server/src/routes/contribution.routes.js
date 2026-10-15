import { Router } from 'express';
import { validatePlan, generatePRDescription } from '../controllers/contribution.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { validatePlanObject, validatePRDescriptionBody } from '../validators/contribution.validator.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

// POST /api/contributions/validate-plan
router.post(
  '/validate-plan',
  validate(validatePlanObject, 'body'),
  asyncHandler(validatePlan)
);

// POST /api/contributions/pr-description
router.post(
  '/pr-description',
  validate(validatePRDescriptionBody, 'body'),
  asyncHandler(generatePRDescription)
);

export default router;
