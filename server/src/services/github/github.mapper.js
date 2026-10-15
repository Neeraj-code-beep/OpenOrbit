/**
 * Normalizes raw GitHub issue data into predictable OpenOrbit model
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

/**
 * Normalizes raw GitHub pull request data
 */
export function mapGitHubPullRequest(pr) {
  if (!pr) return null;

  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    body: pr.body || '',
    state: pr.state,
    htmlUrl: pr.html_url,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    closedAt: pr.closed_at || null,
    mergedAt: pr.merged_at || null,
    isDraft: Boolean(pr.draft),
    author: pr.user ? pr.user.login : 'unknown',
    authorAvatar: pr.user ? pr.user.avatar_url : null,
    baseBranch: pr.base ? pr.base.ref : '',
    headBranch: pr.head ? pr.head.ref : '',
    labels: Array.isArray(pr.labels)
      ? pr.labels.map((l) => (typeof l === 'string' ? { name: l } : { name: l.name, color: l.color }))
      : [],
  };
}

/**
 * Normalizes raw GitHub commit data
 */
export function mapGitHubCommit(c) {
  if (!c) return null;

  const commitDetails = c.commit || {};
  const author = commitDetails.author || {};
  const committer = commitDetails.committer || {};

  return {
    sha: c.sha,
    shortSha: c.sha ? c.sha.slice(0, 7) : '',
    message: commitDetails.message || '',
    authorName: author.name || 'Unknown',
    authorEmail: author.email || '',
    date: author.date || committer.date || null,
    authorAvatar: c.author ? c.author.avatar_url : null,
    authorLogin: c.author ? c.author.login : null,
    htmlUrl: c.html_url,
  };
}

/**
 * Normalizes raw GitHub activity / event stream data
 */
export function mapGitHubActivity(event) {
  if (!event) return null;

  return {
    id: event.id,
    type: event.type,
    actor: event.actor ? event.actor.login : 'unknown',
    actorAvatar: event.actor ? event.actor.avatar_url : null,
    repo: event.repo ? event.repo.name : '',
    createdAt: event.created_at,
    action: event.payload ? event.payload.action || null : null,
  };
}
