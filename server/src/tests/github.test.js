import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapGitHubIssue,
  mapGitHubRepository,
  mapGitHubPullRequest,
  mapGitHubCommit,
  mapGitHubActivity,
} from '../services/github/github.mapper.js';
import {
  validateRepoParams,
  validateIssueSearchQuery,
  validateUsernameParam,
  validatePullRequestQuery,
} from '../validators/github.validator.js';

describe('GitHub Mapper & Validators', () => {
  it('maps raw GitHub issue correctly', () => {
    const raw = {
      id: 12345,
      number: 42,
      title: 'Fix typo in documentation',
      body: 'Here is the bug description',
      state: 'open',
      html_url: 'https://github.com/facebook/react/issues/42',
      repository_url: 'https://api.github.com/repos/facebook/react',
      created_at: '2026-10-15T00:00:00Z',
      user: { login: 'alice', avatar_url: 'https://avatar.url' },
      labels: [{ name: 'good-first-issue', color: '7057ff' }],
      comments: 3,
    };

    const mapped = mapGitHubIssue(raw);
    assert.equal(mapped.number, 42);
    assert.equal(mapped.title, 'Fix typo in documentation');
    assert.equal(mapped.author, 'alice');
    assert.equal(mapped.repository.owner, 'facebook');
    assert.equal(mapped.repository.name, 'react');
    assert.equal(mapped.labels.length, 1);
    assert.equal(mapped.isPullRequest, false);
  });

  it('detects pull request items and flags them', () => {
    const rawPR = {
      id: 999,
      number: 10,
      title: 'Some PR',
      pull_request: { url: 'https://api.github.com/repos/foo/bar/pulls/10' },
    };
    const mapped = mapGitHubIssue(rawPR);
    assert.equal(mapped.isPullRequest, true);
  });

  it('validates repository path parameters strictly', () => {
    assert.deepEqual(validateRepoParams({ owner: 'facebook', repo: 'react' }), []);

    const invalidErrors = validateRepoParams({ owner: 'evil;rm -rf', repo: '../bar' });
    assert.ok(invalidErrors.length >= 2);
  });

  it('validates search query parameters', () => {
    assert.deepEqual(validateIssueSearchQuery({ page: '2', per_page: '20' }), []);
    
    const invalidErrors = validateIssueSearchQuery({ page: '-1', per_page: '9999' });
    assert.equal(invalidErrors.length, 2);
  });

  it('maps GitHub pull requests correctly', () => {
    const rawPR = {
      id: 101,
      number: 5,
      title: 'feat: add oauth linking',
      body: 'Detailed description',
      state: 'open',
      html_url: 'https://github.com/owner/repo/pull/5',
      created_at: '2026-10-15T00:00:00Z',
      updated_at: '2026-10-15T01:00:00Z',
      draft: false,
      user: { login: 'octocat', avatar_url: 'https://avatar.url' },
      base: { ref: 'main' },
      head: { ref: 'feature-branch' },
      labels: [{ name: 'enhancement', color: 'a2eeef' }],
    };

    const mapped = mapGitHubPullRequest(rawPR);
    assert.equal(mapped.number, 5);
    assert.equal(mapped.title, 'feat: add oauth linking');
    assert.equal(mapped.author, 'octocat');
    assert.equal(mapped.baseBranch, 'main');
    assert.equal(mapped.headBranch, 'feature-branch');
    assert.equal(mapped.isDraft, false);
    assert.equal(mapped.labels.length, 1);
  });

  it('maps GitHub commits correctly', () => {
    const rawCommit = {
      sha: 'abc1234567890abcdef1234567890abcdef12345',
      commit: {
        message: 'fix: handle token expiration',
        author: { name: 'Dev', email: 'dev@example.com', date: '2026-10-15T00:00:00Z' },
      },
      author: { login: 'devuser', avatar_url: 'https://avatar.url' },
      html_url: 'https://github.com/owner/repo/commit/abc1234',
    };

    const mapped = mapGitHubCommit(rawCommit);
    assert.equal(mapped.sha, 'abc1234567890abcdef1234567890abcdef12345');
    assert.equal(mapped.shortSha, 'abc1234');
    assert.equal(mapped.message, 'fix: handle token expiration');
    assert.equal(mapped.authorName, 'Dev');
    assert.equal(mapped.authorLogin, 'devuser');
  });

  it('maps GitHub activity events correctly', () => {
    const rawEvent = {
      id: '998877',
      type: 'PushEvent',
      actor: { login: 'coder', avatar_url: 'https://avatar.url' },
      repo: { name: 'owner/repo' },
      created_at: '2026-10-15T00:00:00Z',
      payload: { action: 'opened' },
    };

    const mapped = mapGitHubActivity(rawEvent);
    assert.equal(mapped.id, '998877');
    assert.equal(mapped.type, 'PushEvent');
    assert.equal(mapped.actor, 'coder');
    assert.equal(mapped.repo, 'owner/repo');
    assert.equal(mapped.action, 'opened');
  });

  it('validates username parameter strictly', () => {
    assert.deepEqual(validateUsernameParam({ username: 'valid-user-123' }), []);
    assert.ok(validateUsernameParam({ username: 'invalid;rm' }).length >= 1);
    assert.ok(validateUsernameParam({ username: '' }).length >= 1);
  });

  it('validates pull request query parameters', () => {
    assert.deepEqual(validatePullRequestQuery({ state: 'open', page: '1', per_page: '10' }), []);
    const invalid = validatePullRequestQuery({ state: 'invalid-state', page: '0', per_page: '500' });
    assert.equal(invalid.length, 3);
  });
});
