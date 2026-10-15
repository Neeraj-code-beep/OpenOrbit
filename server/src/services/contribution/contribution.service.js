import { aiService } from '../ai/ai.service.js';
import { generatePRDescription } from './pr-description.service.js';
import { AppError } from '../../utils/app-error.js';

export class ContributionService {
  constructor(ai = aiService) {
    this.ai = ai;
  }

  /**
   * Generates plan and preliminary PR description
   */
  async createContributionPlan(payload) {
    const planResult = await this.ai.generateContributionPlan(payload);
    
    // Generate PR description based on plan
    const prDescription = generatePRDescription({
      plan: planResult.data,
      issueTitle: payload.issueTitle,
      issueNumber: payload.issueNumber,
      repoOwner: payload.repoOwner,
      repoName: payload.repoName,
    });

    return {
      plan: planResult.data,
      prDescription,
      meta: planResult.meta,
    };
  }

  /**
   * Validates a human-modified or generated plan
   */
  validatePlan(plan) {
    if (!plan || !plan.implementationSteps || plan.implementationSteps.length === 0) {
      throw new AppError('Plan must contain at least one implementation step', 400, 'INVALID_PLAN');
    }

    const verifiedFiles = (plan.relevantFiles || []).filter((f) => f.isVerified);
    const proposedFiles = (plan.relevantFiles || []).filter((f) => !f.isVerified);

    return {
      isValid: true,
      summary: plan.issueSummary,
      stepCount: plan.implementationSteps.length,
      fileStats: {
        verifiedCount: verifiedFiles.length,
        proposedCount: proposedFiles.length,
      },
      hasRisksDocumented: (plan.dependenciesAndRisks || []).length > 0,
      hasAcceptanceCriteria: (plan.acceptanceCriteria || []).length > 0,
    };
  }
}

export const contributionService = new ContributionService();
