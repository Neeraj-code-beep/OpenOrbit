/**
 * Validates issue search query parameters
 */
export function validateIssueSearchQuery(query) {
  const errors = [];
  if (!query) return errors;

  if (query.page && (isNaN(Number(query.page)) || Number(query.page) < 1)) {
    errors.push('page must be a positive integer');
  }
  if (query.per_page && (isNaN(Number(query.per_page)) || Number(query.per_page) < 1 || Number(query.per_page) > 100)) {
    errors.push('per_page must be an integer between 1 and 100');
  }
  return errors;
}

/**
 * Validates repo owner and repo name path parameters
 */
export function validateRepoParams(params) {
  const errors = [];
  if (!params.owner || typeof params.owner !== 'string' || !params.owner.trim()) {
    errors.push('owner parameter is required');
  }
  if (!params.repo || typeof params.repo !== 'string' || !params.repo.trim()) {
    errors.push('repo parameter is required');
  }
  // Sanitize characters to avoid path traversal / injection
  const safeRegex = /^[a-zA-Z0-9_.-]+$/;
  if (params.owner && !safeRegex.test(params.owner)) {
    errors.push('owner contains invalid characters');
  }
  if (params.repo && !safeRegex.test(params.repo)) {
    errors.push('repo contains invalid characters');
  }
  return errors;
}

/**
 * Validates issue detail path parameters
 */
export function validateIssueNumberParams(params) {
  const errors = validateRepoParams(params);
  if (!params.issueNumber || isNaN(Number(params.issueNumber)) || Number(params.issueNumber) < 1) {
    errors.push('issueNumber must be a positive integer');
  }
  return errors;
}

/**
 * Validates username path parameter
 */
export function validateUsernameParam(params) {
  const errors = [];
  if (!params.username || typeof params.username !== 'string' || !params.username.trim()) {
    errors.push('username parameter is required');
  } else if (!/^[a-zA-Z0-9-]+$/.test(params.username.trim())) {
    errors.push('username contains invalid characters');
  }
  return errors;
}

/**
 * Validates pull request query parameters
 */
export function validatePullRequestQuery(query) {
  const errors = [];
  if (!query) return errors;

  if (query.state && !['open', 'closed', 'all'].includes(query.state)) {
    errors.push("state must be one of 'open', 'closed', or 'all'");
  }
  if (query.page && (isNaN(Number(query.page)) || Number(query.page) < 1)) {
    errors.push('page must be a positive integer');
  }
  if (query.per_page && (isNaN(Number(query.per_page)) || Number(query.per_page) < 1 || Number(query.per_page) > 100)) {
    errors.push('per_page must be an integer between 1 and 100');
  }
  return errors;
}
