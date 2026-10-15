import { aiRouter } from './ai.router.js';
import { buildContributionPlanPrompt } from './prompts/contribution-plan.prompt.js';
import { parseAndValidatePlan } from '../contribution/plan.validator.js';
import { githubService } from '../github/github.service.js';

export class AIService {
  constructor(router = aiRouter, ghService = githubService) {
    this.router = router;
    this.ghService = ghService;
  }

  /**
   * Generates a structured contribution plan
   */
  async generateContributionPlan({ issueTitle, issueBody, repoOwner, repoName, verifiedFiles = [] }) {
    const startTime = Date.now();
    let repoReadme = '';

    // If owner and repo are provided, fetch the README for real context
    if (repoOwner && repoName) {
      try {
        repoReadme = await this.ghService.getRepositoryReadme(repoOwner, repoName);
      } catch (err) {
        console.warn(`[AI_SERVICE] Could not retrieve README for ${repoOwner}/${repoName}:`, err.message);
      }
    }

    const fullRepoName = repoOwner && repoName ? `${repoOwner}/${repoName}` : repoName || '';

    // Build injection-safe prompt
    const prompt = buildContributionPlanPrompt({
      issueTitle,
      issueBody,
      repoName: fullRepoName,
      repoReadme,
      verifiedFiles,
    });

    // Execute through router
    const rawOutput = await this.router.generateText(prompt);

    // Parse and validate strictly
    const plan = parseAndValidatePlan(rawOutput, {
      repoName: fullRepoName,
      issueTitle,
    });

    const durationMs = Date.now() - startTime;

    return {
      success: true,
      data: plan,
      meta: {
        provider: this.router.getActiveProviderName(),
        durationMs,
        hasRepoContext: Boolean(repoReadme),
      },
    };
  }
}

export const aiService = new AIService();
