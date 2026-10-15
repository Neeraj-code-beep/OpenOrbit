import { Router } from 'express';
import {
  saveIssue,
  getSavedIssues,
  getSavedIssueById,
  updateSavedIssue,
  deleteSavedIssue,
} from '../controllers/saved-issue.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

// All saved issue operations are user-scoped and require active authentication
router.use(requireAuth);

router.post('/', asyncHandler(saveIssue));
router.get('/', asyncHandler(getSavedIssues));
router.get('/:id', asyncHandler(getSavedIssueById));
router.patch('/:id', asyncHandler(updateSavedIssue));
router.delete('/:id', asyncHandler(deleteSavedIssue));

export default router;
