import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.get('/', asyncHandler(getHealth));

export default router;
