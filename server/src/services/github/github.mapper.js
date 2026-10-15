/**
 * Normalizes raw GitHub issue data into predictable PRPath model
 */
export function mapGitHubIssue(item) {
  if (!item) return null;

  // Extract owner and repo from repository_url or html_url
  let owner = '';
  let repo = '';
  if (item.repository_url) {
    const parts = item.repository_url.split('/');
    repo = parts[parts.length - 1];
    owner = parts[parts.length - 2];
  } else if (item.html_url) {
    const match = item.html_url.match(/github\.com\/([^/]+)\/([^/]+)\/issues/);
    if (match) {
      owner = match[1];
      repo = match[2];
    }
  }

  return {
    id: item.id,
    number: item.number,
    title: item.title,
    body: item.body || '',
    state: item.state,
    htmlUrl: item.html_url,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    author: item.user ? item.user.login : 'unknown',
    authorAvatar: item.user ? item.user.avatar_url : null,
    commentsCount: item.comments || 0,
    repository: {
      owner,
      name: repo,
      fullName: owner && repo ? `${owner}/${repo}` : '',
    },
    labels: Array.isArray(item.labels)
      ? item.labels.map((l) => (typeof l === 'string' ? { name: l } : { name: l.name, color: l.color, description: l.description }))
      : [],
    isPullRequest: Boolean(item.pull_request),
  };
}

/**
 * Normalizes raw GitHub repository data
 */
export function mapGitHubRepository(repo) {
  if (!repo) return null;

  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner ? repo.owner.login : '',
    description: repo.description || '',
    htmlUrl: repo.html_url,
    starsCount: repo.stargazers_count || 0,
    forksCount: repo.forks_count || 0,
    openIssuesCount: repo.open_issues_count || 0,
    language: repo.language || 'Unknown',
    license: repo.license ? repo.license.spdx_id || repo.license.name : 'Not specified',
    defaultBranch: repo.default_branch || 'main',
    isArchived: Boolean(repo.archived),
    updatedAt: repo.updated_at,
  };
}
