import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { SavedIssue } from '../models/saved-issue.model.js';
import { User } from '../models/user.model.js';
import { githubService } from '../services/github/github.service.js';
import { env } from '../config/env.js';

describe('Issue Recommendations API', () => {
  const app = createApp();
  let server;
  let port;
  let baseUrl;

  const testUserId = '661000000000000000000001';
  let sessionToken;

  beforeEach(() => {
    server = app.listen(0);
    port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/v1/recommendations/issues`;

    sessionToken = jwt.sign(
      { sub: testUserId, email: 'ada@example.com' },
      env.JWT_SECRET,
      { algorithm: env.JWT_ALGORITHM, expiresIn: '1h' }
    );
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await fetch(baseUrl);
    assert.equal(res.status, 401);
  });

  it('returns recommended issues for authenticated user with empty saved issues', async (t) => {
    t.mock.method(User, 'findById', () => ({
      select: async () => ({ _id: testUserId, name: 'Ada', email: 'ada@example.com' }),
    }));

    // User has no saved issues
    t.mock.method(SavedIssue, 'find', () => ({
      select: () => ({
        limit: () => ({
          lean: async () => [],
        }),
      }),
    }));

    // GitHub returns some issues
    t.mock.method(githubService, 'searchIssues', async () => ({
      totalCount: 1,
      page: 1,
      perPage: 15,
      rateLimit: { limit: 60, remaining: 58 },
      issues: [
        {
          id: 1001,
          number: 5,
          title: 'Add unit tests for parser',
          repository: { owner: 'acme', name: 'toolkit', fullName: 'acme/toolkit' },
          labels: [{ name: 'good-first-issue', color: '7057ff' }],
        },
      ],
    }));

    const res = await fetch(baseUrl, {
      headers: { Cookie: `${env.COOKIE_NAME}=${sessionToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.length, 1);
    assert.equal(json.data[0].title, 'Add unit tests for parser');
    assert.equal(json.meta.derivedLanguage, null);
    assert.deepEqual(json.meta.excludedRepos, []);
  });

  it('derives language from saved issues and excludes already-saved repos', async (t) => {
    t.mock.method(User, 'findById', () => ({
      select: async () => ({ _id: testUserId, name: 'Ada', email: 'ada@example.com' }),
    }));

    // User has saved issues from facebook/react with javascript label
    t.mock.method(SavedIssue, 'find', () => ({
      select: () => ({
        limit: () => ({
          lean: async () => [
            {
              repository: { fullName: 'facebook/react' },
              labels: [{ name: 'javascript' }, { name: 'good-first-issue' }],
            },
            {
              repository: { fullName: 'vercel/next.js' },
              labels: [{ name: 'typescript' }],
            },
          ],
        }),
      }),
    }));

    t.mock.method(githubService, 'searchIssues', async (opts) => {
      // Verify the derived language is passed through
      assert.equal(opts.language, 'javascript');
      return {
        totalCount: 2,
        page: 1,
        perPage: 15,
        rateLimit: { limit: 60, remaining: 57 },
        issues: [
          {
            id: 2001,
            number: 10,
            title: 'Fix event handler in React',
            repository: { owner: 'facebook', name: 'react', fullName: 'facebook/react' },
            labels: [{ name: 'good-first-issue' }],
          },
          {
            id: 2002,
            number: 20,
            title: 'Improve logging utility',
            repository: { owner: 'nodejs', name: 'node', fullName: 'nodejs/node' },
            labels: [{ name: 'good-first-issue' }],
          },
        ],
      };
    });

    const res = await fetch(baseUrl, {
      headers: { Cookie: `${env.COOKIE_NAME}=${sessionToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    // facebook/react should be excluded since user already has saved issues there
    assert.equal(json.data.length, 1);
    assert.equal(json.data[0].repository.fullName, 'nodejs/node');
    assert.equal(json.meta.derivedLanguage, 'javascript');
    assert.ok(json.meta.excludedRepos.includes('facebook/react'));
    assert.ok(json.meta.excludedRepos.includes('vercel/next.js'));
  });

  it('uses explicit language parameter over derived preference', async (t) => {
    t.mock.method(User, 'findById', () => ({
      select: async () => ({ _id: testUserId, name: 'Ada', email: 'ada@example.com' }),
    }));

    t.mock.method(SavedIssue, 'find', () => ({
      select: () => ({
        limit: () => ({
          lean: async () => [
            {
              repository: { fullName: 'facebook/react' },
              labels: [{ name: 'javascript' }],
            },
          ],
        }),
      }),
    }));

    t.mock.method(githubService, 'searchIssues', async (opts) => {
      // Explicit param should override derived "javascript"
      assert.equal(opts.language, 'python');
      return {
        totalCount: 0,
        page: 1,
        perPage: 15,
        rateLimit: { limit: 60, remaining: 56 },
        issues: [],
      };
    });

    const res = await fetch(`${baseUrl}?language=python`, {
      headers: { Cookie: `${env.COOKIE_NAME}=${sessionToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.deepEqual(json.data, []);
    assert.equal(json.meta.derivedLanguage, 'python');
  });

  it('gracefully handles database errors during preference derivation', async (t) => {
    t.mock.method(User, 'findById', () => ({
      select: async () => ({ _id: testUserId, name: 'Ada', email: 'ada@example.com' }),
    }));

    // Simulate DB failure
    t.mock.method(SavedIssue, 'find', () => ({
      select: () => ({
        limit: () => ({
          lean: async () => { throw new Error('ECONNREFUSED'); },
        }),
      }),
    }));

    t.mock.method(githubService, 'searchIssues', async () => ({
      totalCount: 1,
      page: 1,
      perPage: 15,
      rateLimit: { limit: 60, remaining: 55 },
      issues: [
        {
          id: 3001,
          number: 99,
          title: 'Improve docs',
          repository: { owner: 'org', name: 'repo', fullName: 'org/repo' },
          labels: [],
        },
      ],
    }));

    const res = await fetch(baseUrl, {
      headers: { Cookie: `${env.COOKIE_NAME}=${sessionToken}` },
    });

    // Should still succeed with degraded recommendations (no personalization)
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.length, 1);
    assert.deepEqual(json.meta.excludedRepos, []);
  });
});
