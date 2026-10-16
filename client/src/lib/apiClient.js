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

const RAW_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || '').trim();
const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

async function request(endpoint, options = {}) {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = API_BASE_URL ? `${API_BASE_URL}${normalizedEndpoint}` : normalizedEndpoint;
  const config = {
    credentials: 'include',
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
  // Authentication
  register: (payload) =>
    request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload) =>
    request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () =>
    request('/api/v1/auth/logout', {
      method: 'POST',
    }),

  getMe: () => request('/api/v1/auth/me'),

  reauthenticate: (payload) =>
    request('/api/v1/auth/reauth', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getGitHubAuthUrl: () =>
    API_BASE_URL ? `${API_BASE_URL}/api/v1/auth/github` : '/api/v1/auth/github',

  getGitHubLinkUrl: ({ ticket, redirectTo = '/settings' } = {}) => {
    const base = API_BASE_URL ? `${API_BASE_URL}/api/v1/auth/github` : '/api/v1/auth/github';
    const params = new URLSearchParams({ link: 'true' });
    if (ticket) params.set('ticket', ticket);
    if (redirectTo) params.set('redirect_to', redirectTo);
    return `${base}?${params.toString()}`;
  },

  unlinkGitHub: () =>
    request('/api/v1/auth/github', {
      method: 'DELETE',
    }),

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

  searchRepositories: (params = {}) => {
    const query = new URLSearchParams();
    if (params.query) query.set('query', params.query);
    if (params.language) query.set('language', params.language);
    if (params.topic) query.set('topic', params.topic);
    if (params.minStars) query.set('minStars', params.minStars);
    if (params.sort) query.set('sort', params.sort);
    if (params.order) query.set('order', params.order);
    if (params.page) query.set('page', params.page);
    if (params.per_page) query.set('per_page', params.per_page);
    return request(`/api/github/repositories?${query.toString()}`);
  },

  getRepository: (owner, repo) => request(`/api/github/repositories/${owner}/${repo}`),
  
  getIssueDetails: (owner, repo, issueNumber) =>
    request(`/api/github/repositories/${owner}/${repo}/issues/${issueNumber}`),

  getPullRequests: (owner, repo, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/github/repositories/${owner}/${repo}/pulls${query ? `?${query}` : ""}`);
  },

  getCommits: (owner, repo) => request(`/api/github/repositories/${owner}/${repo}/commits`),

  getUserActivity: (username) => request(`/api/github/users/${username}/activity`),

  getUserRepositories: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/github/user/repos${query ? `?${query}` : ""}`);
  },

  // Saved Issues (User-scoped, authenticated)
  getSavedIssues: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/v1/saved-issues${query ? `?${query}` : ""}`);
  },

  saveIssue: (payload) =>
    request('/api/v1/saved-issues', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateSavedIssue: (id, payload) =>
    request(`/api/v1/saved-issues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteSavedIssue: (id) =>
    request(`/api/v1/saved-issues/${id}`, {
      method: 'DELETE',
    }),

  // Recommendations (Personalized issue suggestions)
  getRecommendations: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/api/v1/recommendations/issues${query ? `?${query}` : ""}`);
  },

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

  analyzeIssue: (payload) =>
    request('/api/ai/analyze-issue', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  analyzeCode: (payload) =>
    request('/api/ai/analyze-code', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getRepositoryContext: (payload) =>
    request('/api/ai/repository-context', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMCPStatus: () => request('/api/mcp/status'),
};
