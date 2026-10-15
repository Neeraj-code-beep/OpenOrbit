/**
 * Unified frontend API client for communicating with OpenOrbit Backend
 */
export class ApiError extends Error {
  constructor(message, status, code, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const errorMsg = data?.error?.message || data?.message || `Request failed with status ${res.status}`;
      const errorCode = data?.error?.code || 'API_ERROR';
      const details = data?.error?.details || null;
      throw new ApiError(errorMsg, res.status, errorCode, details);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(`Network connection error: ${err.message}`, 0, 'NETWORK_ERROR');
  }
}

export const api = {
  // Health
  getHealth: () => request('/api/health'),

  // GitHub Issues & Repos
  searchIssues: (params = {}) => {
    const query = new URLSearchParams();
    if (params.query) query.set('query', params.query);
    if (params.label) query.set('label', params.label);
    if (params.language) query.set('language', params.language);
    if (params.page) query.set('page', params.page);
    if (params.per_page) query.set('per_page', params.per_page);
    return request(`/api/github/issues?${query.toString()}`);
  },

  getRepository: (owner, repo) => request(`/api/github/repositories/${owner}/${repo}`),
  
  getIssueDetails: (owner, repo, issueNumber) =>
    request(`/api/github/repositories/${owner}/${repo}/issues/${issueNumber}`),

  // AI & Contribution Planning
  getAIStatus: () => request('/api/ai/status'),

  generateContributionPlan: (payload) =>
    request('/api/ai/contribution-plan', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  validatePlan: (plan) =>
    request('/api/contributions/validate-plan', {
      method: 'POST',
      body: JSON.stringify(plan),
    }),

  generatePRDescription: (payload) =>
    request('/api/contributions/pr-description', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMCPStatus: () => request('/api/mcp/status'),
};
