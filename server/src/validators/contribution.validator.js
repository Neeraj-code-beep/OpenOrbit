/**
 * Validates request body for AI contribution plan generation
 */
export function validateContributionPlanBody(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    return ['Request body must be a valid JSON object'];
  }

  if (!body.issueTitle || typeof body.issueTitle !== 'string' || !body.issueTitle.trim()) {
    errors.push('issueTitle is required and must be a non-empty string');
  }

  if (body.issueBody && typeof body.issueBody !== 'string') {
    errors.push('issueBody must be a string');
  }

  if (body.repoName && typeof body.repoName !== 'string') {
    errors.push('repoName must be a string');
  }

  // Ensure issue body is within reasonable bounded size to prevent oversized prompt abuse
  if (body.issueBody && body.issueBody.length > 30000) {
    errors.push('issueBody exceeds maximum allowed size (30,000 characters)');
  }

  return errors;
}

/**
 * Validates plan object submitted for validation or PR description generation
 */
export function validatePlanObject(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    return ['Request body must be a valid JSON object'];
  }
  if (!body.issueSummary || typeof body.issueSummary !== 'string') {
    errors.push('plan must include issueSummary');
  }
  if (!body.implementationSteps || !Array.isArray(body.implementationSteps) || body.implementationSteps.length === 0) {
    errors.push('plan must include at least one implementation step');
  }
  return errors;
}
