import { Router } from 'express';
import {
  searchIssues,
  searchRepositories,
  getRepository,
  getIssueDetails,
  getPullRequests,
  getCommits,
  getUserActivity,
  getUserRepositories,
} from '../controllers/github.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  validateIssueSearchQuery,
  validateRepoSearchQuery,
  validateRepoParams,
  validateIssueNumberParams,
  validateUsernameParam,
  validatePullRequestQuery,
} from '../validators/github.validator.js';
import { asyncHandler } from '../utils/async-handler.js';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/github/issues - Search issues
router.get(
  '/issues',
  optionalAuth,
  validate(validateIssueSearchQuery, 'query'),
  asyncHandler(searchIssues)
);

// GET /api/github/repositories - Search repositories
router.get(
  '/repositories',
  optionalAuth,
  validate(validateRepoSearchQuery, 'query'),
  asyncHandler(searchRepositories)
);

// GET /api/github/repositories/:owner/:repo - Repository details
router.get(
  '/repositories/:owner/:repo',
  optionalAuth,
  validate(validateRepoParams, 'params'),
  asyncHandler(getRepository)
);

// GET /api/github/repositories/:owner/:repo/issues/:issueNumber - Issue details
router.get(
  '/repositories/:owner/:repo/issues/:issueNumber',
  optionalAuth,
  validate(validateIssueNumberParams, 'params'),
  asyncHandler(getIssueDetails)
);

// GET /api/github/repositories/:owner/:repo/pulls - Repository pull requests
router.get(
  '/repositories/:owner/:repo/pulls',
  optionalAuth,
  validate(validateRepoParams, 'params'),
  validate(validatePullRequestQuery, 'query'),
  asyncHandler(getPullRequests)
);

// GET /api/github/repositories/:owner/:repo/commits - Repository commits
router.get(
  '/repositories/:owner/:repo/commits',
  optionalAuth,
  validate(validateRepoParams, 'params'),
  asyncHandler(getCommits)
);

// GET /api/github/users/:username/activity - User public activity
router.get(
  '/users/:username/activity',
  optionalAuth,
  validate(validateUsernameParam, 'params'),
  asyncHandler(getUserActivity)
);

// GET /api/github/user/repos - Authenticated user repositories (requires connected GitHub account)
router.get(
  '/user/repos',
  requireAuth,
  asyncHandler(getUserRepositories)
);

export default router;
