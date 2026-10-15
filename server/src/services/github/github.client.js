import { env } from '../../config/env.js';
import { AppError } from '../../utils/app-error.js';

/**
 * Low-level HTTP client for GitHub REST API with timeouts, rate limit awareness, and authentication headers
 */
export class GitHubClient {
  constructor() {
    this.baseUrl = env.GITHUB_API_BASE;
    this.token = env.GITHUB_TOKEN;
    this.timeoutMs = 12000;
  }

  /**
   * Builds request headers
   * @private
   */
  _getHeaders() {
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'PRPath-Contribution-Assistant/1.0',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Performs an HTTP request to the GitHub API
   * @param {string} endpoint - API path, e.g. '/search/issues'
   * @param {Object} [queryParams={}]
   * @returns {Promise<{ data: any, rateLimit: { limit: number, remaining: number, reset: number } }>}
   */
  async request(endpoint, queryParams = {}) {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`);
    
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this._getHeaders(),
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
