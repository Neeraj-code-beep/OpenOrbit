import { aiService } from '../services/ai/ai.service.js';
import { aiRouter } from '../services/ai/ai.router.js';

/**
 * Generates an AI-assisted contribution plan
 */
export async function generateContributionPlan(req, res) {
  const { issueTitle, issueBody, repoOwner, repoName, verifiedFiles } = req.body;

  const result = await aiService.generateContributionPlan({
    issueTitle,
    issueBody,
    repoOwner,
    repoName,
    verifiedFiles,
  });

  res.status(200).json(result);
}

/**
 * Checks AI provider availability
 */
export async function getAIStatus(req, res) {
  const status = await aiRouter.checkAllProviders();
  res.status(200).json({
    success: true,
    data: status,
  });
}
