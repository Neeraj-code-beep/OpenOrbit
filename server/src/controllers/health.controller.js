import { env, getEnvStatus } from '../config/env.js';
import { githubService } from '../services/github/github.service.js';
import { aiRouter } from '../services/ai/ai.router.js';
import { mcpClient } from '../services/mcp/mcp.client.js';
import { pythonAIClient } from '../services/ai/python-ai.client.js';
import { getDBStatus } from '../config/db.js';

/**
 * Health check controller reporting truthful status of all system dependencies
 */
export async function getHealth(req, res) {
  const uptime = process.uptime();

  // Run live health checks concurrently
  const [ghRateLimit, aiStatus, pythonStatus] = await Promise.all([
    githubService.checkRateLimit(),
    aiRouter.checkAllProviders(),
    pythonAIClient.checkHealth(),
  ]);

  const mcpStatus = mcpClient.getStatus();
  const envSummary = getEnvStatus();

  // Determine overall status
  let overall = 'HEALTHY';
  if (ghRateLimit.error) {
    overall = 'DEGRADED_GITHUB_UNAVAILABLE';
  } else if (ghRateLimit.remaining === 0) {
    overall = 'DEGRADED_GITHUB_RATE_LIMITED';
  } else if (
    envSummary.aiProvider !== 'none' && (
      (envSummary.aiProvider === 'gemini' && !envSummary.hasGeminiKey) ||
      (envSummary.aiProvider === 'ollama' && aiStatus.providers.ollama.status === 'OFFLINE')
    )
  ) {
    overall = 'DEGRADED_AI_UNAVAILABLE';
  }

  res.status(200).json({
    status: overall,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(uptime),
    service: 'OpenOrbit Backend API',
    version: '1.0.0',
    environment: env.NODE_ENV,
    checks: {
      github: {
        status: ghRateLimit.error ? 'ERROR' : ghRateLimit.remaining === 0 ? 'RATE_LIMITED' : 'HEALTHY',
        authenticated: ghRateLimit.authenticated,
        rateLimit: {
          limit: ghRateLimit.limit,
          remaining: ghRateLimit.remaining,
          resetsAt: ghRateLimit.resetTime,
        },
        error: ghRateLimit.error || null,
      },
      ai: {
        activeProvider: aiStatus.activeProvider,
        gemini: aiStatus.providers.gemini,
        ollama: aiStatus.providers.ollama,
      },
      mcp: mcpStatus,
      pythonService: pythonStatus,
      database: getDBStatus(),
    },
  });
}
