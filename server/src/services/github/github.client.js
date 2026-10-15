import { env } from '../../config/env.js';
import { AppError } from '../../utils/app-error.js';

/**
 * Low-level HTTP client for GitHub REST API with timeouts, rate limit awareness, and authentication headers
 */
export class GitHubClient {
  constructor() {
    this.baseUrl = env.GITHUB_API_BASE;
    this._customToken = undefined;
    this.timeoutMs = 12000;
  }

  /**
   * Current GitHub token (defaults dynamically to env.GITHUB_TOKEN unless explicitly set)
   */
  get token() {
    return this._customToken !== undefined ? this._customToken : env.GITHUB_TOKEN;
  }

  set token(value) {
    this._customToken = value;
  }

  /**
   * Builds request headers
   * @private
   */
  _getHeaders(customToken) {
    const token = customToken || this.token;
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'OpenOrbit-Contribution-Assistant/1.0',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Performs an HTTP request to the GitHub API
   * @param {string} endpoint - API path, e.g. '/search/issues'
   * @param {Object} [queryParams={}]
   * @param {Object} [options={}]
   * @param {string} [options.token] - Optional user OAuth token
   * @param {string} [options.method='GET']
   * @param {any} [options.body]
   * @returns {Promise<{ data: any, rateLimit: { limit: number, remaining: number, reset: number } }>}
   */
  async request(endpoint, queryParams = {}, options = {}) {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`);
    
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers = {
      ...this._getHeaders(options.token),
      ...(options.headers || {}),
    };

    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url.toString(), {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      const rateLimit = {
        limit: parseInt(response.headers.get('x-ratelimit-limit') || '60', 10),
        remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0', 10),
        reset: parseInt(response.headers.get('x-ratelimit-reset') || '0', 10),
      };

      if (response.status === 403) {
        const errorBody = await response.json().catch(() => ({}));
        const resetDate = rateLimit.reset ? new Date(rateLimit.reset * 1000).toLocaleTimeString() : 'shortly';
        const isRateLimit = rateLimit.remaining === 0 || (errorBody.message && errorBody.message.includes('rate limit'));
        
        if (isRateLimit) {
          throw new AppError(
            `GitHub API rate limit exceeded. Resets at ${resetDate}. ${
              !this.token ? 'Configure GITHUB_TOKEN in .env for 5,000 req/hr.' : ''
            }`,
            429,
            'GITHUB_RATE_LIMITED',
            { rateLimit }
          );
        }
        throw new AppError(`GitHub access forbidden: ${errorBody.message || 'Check permissions'}`, 403, 'GITHUB_FORBIDDEN');
      }

      if (response.status === 404) {
        throw new AppError(`GitHub resource not found at ${endpoint}`, 404, 'GITHUB_NOT_FOUND');
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new AppError(
          `GitHub API error (${response.status}): ${errorBody.message || response.statusText}`,
          response.status,
          'GITHUB_API_ERROR',
          errorBody
        );
      }

      const data = await response.json();
      return { data, rateLimit };
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new AppError('GitHub API request timed out after 12s', 504, 'GITHUB_TIMEOUT');
      }
      if (err instanceof AppError) throw err;
      throw new AppError(`Failed to connect to GitHub API: ${err.message}`, 502, 'GITHUB_NETWORK_ERROR');
    } finally {
      clearTimeout(timer);
    }
  }
}

export const githubClient = new GitHubClient();
