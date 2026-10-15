import { Router } from 'express';
import { searchIssues, getRepository, getIssueDetails } from '../controllers/github.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { validateIssueSearchQuery, validateRepoParams, validateIssueNumberParams } from '../validators/github.validator.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

// GET /api/github/issues - Search issues
router.get(
  '/issues',
  validate(validateIssueSearchQuery, 'query'),
  asyncHandler(searchIssues)
);

// GET /api/github/repositories/:owner/:repo - Repository details
router.get(
  '/repositories/:owner/:repo',
  validate(validateRepoParams, 'params'),
  asyncHandler(getRepository)
);

// GET /api/github/repositories/:owner/:repo/issues/:issueNumber - Issue details
router.get(
  '/repositories/:owner/:repo/issues/:issueNumber',
  validate(validateIssueNumberParams, 'params'),
  asyncHandler(getIssueDetails)
);

export default router;
