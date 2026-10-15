import { Router } from 'express';
import healthRoutes from './health.routes.js';
import githubRoutes from './github.routes.js';
import aiRoutes from './ai.routes.js';
import contributionRoutes from './contribution.routes.js';
import authRoutes from './auth.routes.js';
import savedIssueRoutes from './saved-issue.routes.js';
import recommendationRoutes from './recommendation.routes.js';
import { mcpClient } from '../services/mcp/mcp.client.js';

const router = Router();

// Authentication Endpoints (/api/v1/auth/* and /api/auth/*)
router.use('/v1/auth', authRoutes);
router.use('/auth', authRoutes);

// Saved Issues Endpoints (/api/v1/saved-issues/* and /api/saved-issues/*)
router.use('/v1/saved-issues', savedIssueRoutes);
router.use('/saved-issues', savedIssueRoutes);

// Recommendations Endpoints (/api/v1/recommendations/* and /api/recommendations/*)
router.use('/v1/recommendations', recommendationRoutes);
router.use('/recommendations', recommendationRoutes);

// Health Endpoints (/api/v1/health and /api/health)
router.use('/v1/health', healthRoutes);
router.use('/health', healthRoutes);

// GitHub Endpoints (/api/v1/github/* and /api/github/*)
router.use('/v1/github', githubRoutes);
router.use('/github', githubRoutes);

// AI Endpoints (/api/v1/ai/* and /api/ai/*)
router.use('/v1/ai', aiRoutes);
router.use('/ai', aiRoutes);

// Contributions Endpoints (/api/v1/contributions/* and /api/contributions/*)
router.use('/v1/contributions', contributionRoutes);
router.use('/contributions', contributionRoutes);

// Direct MCP status route (/api/v1/mcp/status and /api/mcp/status)
const mcpStatusHandler = (req, res) => {
  res.status(200).json({
    success: true,
    data: mcpClient.getStatus(),
  });
};
router.get('/v1/mcp/status', mcpStatusHandler);
router.get('/mcp/status', mcpStatusHandler);

export default router;
