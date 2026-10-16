import { githubService } from '../services/github/github.service.js';
import { getUserGitHubToken } from '../services/github/github-oauth.service.js';
import { AppError } from '../utils/app-error.js';

/**
 * Searches real GitHub issues
 */
export async function searchIssues(req, res) {
  const { query, label, language, page, per_page } = req.query;
  const token = req.user?.id ? await getUserGitHubToken(req.user.id) : null;

  const result = await githubService.searchIssues({
    query,
    label: label !== undefined ? label : 'good-first-issue',
    language,
    page: page ? Number(page) : 1,
    per_page: per_page ? Number(per_page) : 15,
    token,
  });

  res.status(200).json({
    success: true,
    data: result.issues,
    pagination: {
      totalCount: result.totalCount,
      page: result.page,
      perPage: result.perPage,
    },
    rateLimit: result.rateLimit,
  });
}

/**
 * Searches real GitHub repositories
 */
export async function searchRepositories(req, res) {
  const { query, language, topic, minStars, sort, order, page, per_page } = req.query;
  const token = req.user?.id ? await getUserGitHubToken(req.user.id) : null;

  const result = await githubService.searchRepositories({
    query,
    language,
    topic,
    minStars: minStars ? Number(minStars) : 0,
    sort,
    order,
    page: page ? Number(page) : 1,
    per_page: per_page ? Number(per_page) : 15,
    token,
  });

  res.status(200).json({
    success: true,
    data: result.repositories,
    pagination: {
      totalCount: result.totalCount,
      page: result.page,
      perPage: result.perPage,
    },
    rateLimit: result.rateLimit,
  });
}

/**
 * Fetches repository metadata and README
 */
export async function getRepository(req, res) {
  const { owner, repo } = req.params;
  const token = req.user?.id ? await getUserGitHubToken(req.user.id) : null;

  const [{ repository, rateLimit }, readme] = await Promise.all([
    githubService.getRepository(owner, repo, { token }),
    githubService.getRepositoryReadme(owner, repo, { token }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      ...repository,
      readmeSnippet: readme ? readme.slice(0, 4000) : null,
    },
    rateLimit,
  });
}

/**
 * Fetches single issue details
 */
export async function getIssueDetails(req, res) {
  const { owner, repo, issueNumber } = req.params;
  const token = req.user?.id ? await getUserGitHubToken(req.user.id) : null;

  const result = await githubService.getIssueDetails(owner, repo, Number(issueNumber), { token });

  res.status(200).json({
    success: true,
    data: result.issue,
    rateLimit: result.rateLimit,
  });
}

/**
 * GET /api/github/repositories/:owner/:repo/pulls
 * Fetches pull requests for a repository
 */
export async function getPullRequests(req, res) {
  const { owner, repo } = req.params;
  const { state = 'open', page = 1, per_page = 15 } = req.query;
  const token = req.user?.id ? await getUserGitHubToken(req.user.id) : null;

  const result = await githubService.getPullRequests(owner, repo, {
    state,
    page: Number(page),
    per_page: Number(per_page),
    token,
  });

  res.status(200).json({
    success: true,
    data: result.pullRequests,
    pagination: {
      page: result.page,
      perPage: result.perPage,
    },
    rateLimit: result.rateLimit,
  });
}

/**
 * GET /api/github/repositories/:owner/:repo/commits
 * Fetches recent commits for a repository
 */
export async function getCommits(req, res) {
  const { owner, repo } = req.params;
  const { sha, page = 1, per_page = 15 } = req.query;
  const token = req.user?.id ? await getUserGitHubToken(req.user.id) : null;

  const result = await githubService.getCommits(owner, repo, {
    sha,
    page: Number(page),
    per_page: Number(per_page),
    token,
  });

  res.status(200).json({
    success: true,
    data: result.commits,
    pagination: {
      page: result.page,
      perPage: result.perPage,
    },
    rateLimit: result.rateLimit,
  });
}

/**
 * GET /api/github/users/:username/activity
 * Fetches public activity stream for a user
 */
export async function getUserActivity(req, res) {
  const { username } = req.params;
  const { page = 1, per_page = 15 } = req.query;
  const token = req.user?.id ? await getUserGitHubToken(req.user.id) : null;

  const result = await githubService.getUserActivity(username, {
    page: Number(page),
    per_page: Number(per_page),
    token,
  });

  res.status(200).json({
    success: true,
    data: result.activity,
    pagination: {
      page: result.page,
      perPage: result.perPage,
    },
    rateLimit: result.rateLimit,
  });
}

/**
 * GET /api/github/user/repos
 * Fetches repositories of the currently authenticated GitHub user (requires connected GitHub account)
 */
export async function getUserRepositories(req, res) {
  if (!req.user?.id) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const token = await getUserGitHubToken(req.user.id);
  if (!token) {
    throw new AppError('No connected GitHub account found. Please connect your GitHub account in Settings.', 400, 'GITHUB_NOT_CONNECTED');
  }

  const { page = 1, per_page = 15, sort = 'updated' } = req.query;

  const result = await githubService.getUserRepositories({
    page: Number(page),
    per_page: Number(per_page),
    sort,
    token,
  });

  res.status(200).json({
    success: true,
    data: result.repositories,
    pagination: {
      page: result.page,
      perPage: result.perPage,
    },
    rateLimit: result.rateLimit,
  });
}
