import { githubService } from '../services/github/github.service.js';

/**
 * Searches real GitHub issues
 */
export async function searchIssues(req, res) {
  const { query, label, language, page, per_page } = req.query;

  const result = await githubService.searchIssues({
    query,
    label: label !== undefined ? label : 'good-first-issue',
    language,
    page: page ? Number(page) : 1,
    per_page: per_page ? Number(per_page) : 15,
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
 * Fetches repository metadata and README
 */
export async function getRepository(req, res) {
  const { owner, repo } = req.params;

  const [repository, readme] = await Promise.all([
    githubService.getRepository(owner, repo),
    githubService.getRepositoryReadme(owner, repo),
  ]);

  res.status(200).json({
    success: true,
    data: {
      ...repository,
      readmeSnippet: readme ? readme.slice(0, 4000) : null,
    },
  });
}

/**
 * Fetches single issue details
 */
export async function getIssueDetails(req, res) {
  const { owner, repo, issueNumber } = req.params;

  const result = await githubService.getIssueDetails(owner, repo, Number(issueNumber));

  res.status(200).json({
    success: true,
    data: result.issue,
    rateLimit: result.rateLimit,
  });
}
