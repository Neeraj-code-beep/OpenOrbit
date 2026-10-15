import { githubClient } from './github.client.js';
import { mapGitHubIssue, mapGitHubRepository } from './github.mapper.js';
import { AppError } from '../../utils/app-error.js';

export class GitHubService {
  constructor(client = githubClient) {
    this.client = client;
  }

  /**
   * Search real GitHub issues based on keywords, good first issue labels, and languages
   */
  async searchIssues({ query = '', label = 'good-first-issue', language = '', page = 1, per_page = 15 } = {}) {
    // Build GitHub search query
    // Example: "is:issue is:open label:\"good-first-issue\" language:javascript"
    const parts = ['is:issue', 'is:open'];

    if (query && query.trim()) {
      parts.push(query.trim());
    }

    if (label && label.trim()) {
      // Support common beginner labels or custom labels
      const cleanLabel = label.trim();
      parts.push(`label:"${cleanLabel}"`);
    }

    if (language && language.trim()) {
      parts.push(`language:${language.trim().toLowerCase()}`);
    }

    const q = parts.join(' ');

    const { data, rateLimit } = await this.client.request('/search/issues', {
      q,
      sort: 'updated',
      order: 'desc',
      page,
      per_page,
    });

    const issues = (data.items || [])
      .map(mapGitHubIssue)
      // Exclude pull requests returned in issue search results
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
  async getRepository(owner, repo) {
    const { data } = await this.client.request(`/repos/${owner}/${repo}`);
    return mapGitHubRepository(data);
  }

  /**
   * Fetch specific issue details
   */
  async getIssueDetails(owner, repo, issueNumber) {
    const { data, rateLimit } = await this.client.request(`/repos/${owner}/${repo}/issues/${issueNumber}`);
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
  async getRepositoryReadme(owner, repo) {
    try {
      const { data } = await this.client.request(`/repos/${owner}/${repo}/readme`);
      if (data && data.content) {
        // Base64 decode README content
        const decoded = Buffer.from(data.content, 'base64').toString('utf-8');
        // Bound content to safe length
        return decoded.slice(0, 8000);
      }
      return '';
    } catch (err) {
      // README is optional context; return empty string if not found
      return '';
    }
  }

  /**
   * Checks current GitHub API rate limit status
   */
  async checkRateLimit() {
    try {
      const { data } = await this.client.request('/rate_limit');
      const core = data.resources?.core || {};
      return {
        limit: core.limit || 60,
        remaining: core.remaining ?? 60,
        resetTime: core.reset ? new Date(core.reset * 1000).toISOString() : null,
        authenticated: Boolean(this.client.token),
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
