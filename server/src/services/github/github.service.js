import { githubClient } from './github.client.js';
import {
  mapGitHubIssue,
  mapGitHubRepository,
  mapGitHubPullRequest,
  mapGitHubCommit,
  mapGitHubActivity,
} from './github.mapper.js';
import { AppError } from '../../utils/app-error.js';

export class GitHubService {
  constructor(client = githubClient) {
    this.client = client;
  }

  /**
   * Search real GitHub issues based on keywords, good first issue labels, and languages
   */
  async searchIssues({ query = '', label = 'good-first-issue', language = '', page = 1, per_page = 15, token = null } = {}) {
    const parts = ['is:issue', 'is:open'];

    if (query && query.trim()) {
      parts.push(query.trim());
    }

    if (label && label.trim()) {
      const cleanLabel = label.trim();
      parts.push(`label:"${cleanLabel}"`);
    }

    if (language && language.trim()) {
      parts.push(`language:${language.trim().toLowerCase()}`);
    }

    const q = parts.join(' ');

    const { data, rateLimit } = await this.client.request(
      '/search/issues',
      {
        q,
        sort: 'updated',
        order: 'desc',
        page,
        per_page,
      },
      { token }
    );

    const issues = (data.items || [])
      .map(mapGitHubIssue)
      .filter((item) => item && !item.isPullRequest);

    return {
      totalCount: data.total_count || 0,
      page: Number(page),
      perPage: Number(per_page),
      rateLimit,
      issues,
    };
  }

  /**
   * Fetch verified repository metadata
   */
  async getRepository(owner, repo, { token = null } = {}) {
    const { data, rateLimit } = await this.client.request(`/repos/${owner}/${repo}`, {}, { token });
    return {
      repository: mapGitHubRepository(data),
      rateLimit,
    };
  }

  /**
   * Fetch repository pull requests
   */
  async getPullRequests(owner, repo, { state = 'open', page = 1, per_page = 15, token = null } = {}) {
    const { data, rateLimit } = await this.client.request(
      `/repos/${owner}/${repo}/pulls`,
      { state, page, per_page },
      { token }
    );

    const pullRequests = Array.isArray(data) ? data.map(mapGitHubPullRequest) : [];

    return {
      pullRequests,
      page: Number(page),
      perPage: Number(per_page),
      rateLimit,
    };
  }

  /**
   * Fetch repository recent commits
   */
  async getCommits(owner, repo, { sha, page = 1, per_page = 15, token = null } = {}) {
    const query = { page, per_page };
    if (sha) query.sha = sha;

    const { data, rateLimit } = await this.client.request(
      `/repos/${owner}/${repo}/commits`,
      query,
      { token }
    );

    const commits = Array.isArray(data) ? data.map(mapGitHubCommit) : [];

    return {
      commits,
      page: Number(page),
      perPage: Number(per_page),
      rateLimit,
    };
  }

  /**
   * Fetch specific issue details
   */
  async getIssueDetails(owner, repo, issueNumber, { token = null } = {}) {
    const { data, rateLimit } = await this.client.request(
      `/repos/${owner}/${repo}/issues/${issueNumber}`,
      {},
      { token }
    );
    if (data.pull_request) {
      throw new AppError(`Item #${issueNumber} is a pull request, not an issue`, 400, 'NOT_AN_ISSUE');
    }
    return {
      issue: mapGitHubIssue(data),
      rateLimit,
    };
  }

  /**
   * Fetch repository README to gather context for planning
   */
  async getRepositoryReadme(owner, repo, { token = null } = {}) {
    try {
      const { data } = await this.client.request(`/repos/${owner}/${repo}/readme`, {}, { token });
      if (data && data.content) {
        const decoded = Buffer.from(data.content, 'base64').toString('utf-8');
        return decoded.slice(0, 8000);
      }
      return '';
    } catch {
      return '';
    }
  }

  /**
   * Fetch public activity events for a user
   */
  async getUserActivity(username, { page = 1, per_page = 15, token = null } = {}) {
    const { data, rateLimit } = await this.client.request(
      `/users/${username}/events/public`,
      { page, per_page },
      { token }
    );

    const activity = Array.isArray(data) ? data.map(mapGitHubActivity) : [];

    return {
      activity,
      page: Number(page),
      perPage: Number(per_page),
      rateLimit,
    };
  }

  /**
   * Fetch repositories for the authenticated user
   */
  async getUserRepositories({ page = 1, per_page = 15, sort = 'updated', token = null } = {}) {
    if (!token) {
      throw new AppError('GitHub authentication token is required to fetch user repositories', 401, 'UNAUTHORIZED');
    }

    const { data, rateLimit } = await this.client.request(
      '/user/repos',
      { page, per_page, sort },
      { token }
    );

    const repositories = Array.isArray(data) ? data.map(mapGitHubRepository) : [];

    return {
      repositories,
      page: Number(page),
      perPage: Number(per_page),
      rateLimit,
    };
  }

  /**
   * Checks current GitHub API rate limit status
   */
  async checkRateLimit(token = null) {
    try {
      const { data } = await this.client.request('/rate_limit', {}, { token });
      const core = data.resources?.core || {};
      return {
        limit: core.limit || 60,
        remaining: core.remaining ?? 60,
        resetTime: core.reset ? new Date(core.reset * 1000).toISOString() : null,
        authenticated: Boolean(token || this.client.token),
      };
    } catch (err) {
      return {
        limit: 60,
        remaining: 0,
        resetTime: null,
        authenticated: false,
        error: err.message,
      };
    }
  }
}

export const githubService = new GitHubService();
