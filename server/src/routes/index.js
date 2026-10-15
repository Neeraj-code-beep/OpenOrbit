import { Router } from 'express';
import healthRoutes from './health.routes.js';
import githubRoutes from './github.routes.js';
import aiRoutes from './ai.routes.js';
import contributionRoutes from './contribution.routes.js';
import { mcpClient } from '../services/mcp/mcp.client.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/github', githubRoutes);
router.use('/ai', aiRoutes);
router.use('/contributions', contributionRoutes);

// Direct MCP status route
router.get('/mcp/status', (req, res) => {
  res.status(200).json({
    success: true,
    data: mcpClient.getStatus(),
  });
});

export default router;
