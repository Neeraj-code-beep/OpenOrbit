import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapGitHubIssue, mapGitHubRepository } from '../services/github/github.mapper.js';
import { validateRepoParams, validateIssueSearchQuery } from '../validators/github.validator.js';

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
});
