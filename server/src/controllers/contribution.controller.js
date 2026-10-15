import { contributionService } from '../services/contribution/contribution.service.js';
import { generatePRDescription as createPRDescription } from '../services/contribution/pr-description.service.js';

/**
 * Validates plan structure and statistics
 */
export async function validatePlan(req, res) {
  const result = contributionService.validatePlan(req.body);
  res.status(200).json({
    success: true,
    data: result,
  });
}

/**
 * Generates PR description from an approved plan
 */
export async function generatePRDescription(req, res) {
  const { plan, issueNumber, issueTitle, repoOwner, repoName } = req.body;
  const description = createPRDescription({
    plan,
    issueNumber,
    issueTitle,
    repoOwner,
    repoName,
  });

  res.status(200).json({
    success: true,
    data: description,
  });
}
