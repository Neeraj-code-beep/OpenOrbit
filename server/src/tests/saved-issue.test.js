import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { SavedIssue } from '../models/saved-issue.model.js';
import { User } from '../models/user.model.js';
import { env } from '../config/env.js';

describe('Saved Issues API System', () => {
  const app = createApp();
  let server;
  let port;
  let baseUrl;

  const testUserId = '661000000000000000000001';
  let sessionToken;

  beforeEach(() => {
    server = app.listen(0);
    port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/v1/saved-issues`;

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

  describe('POST /api/v1/saved-issues (Save Issue)', () => {
    it('rejects unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId: 101, number: 1 }),
      });
      assert.equal(res.status, 401);
    });

    it('rejects payload missing required fields with 400 VALIDATION_ERROR', async (t) => {
      t.mock.method(User, 'findById', () => ({
        select: async () => ({ _id: testUserId, name: 'Ada', email: 'ada@example.com' }),
      }));

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `${env.COOKIE_NAME}=${sessionToken}`,
        },
        body: JSON.stringify({
          issueId: 101,
          // Missing number, title, htmlUrl, repository
        }),
      });

      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.error.code, 'VALIDATION_ERROR');
    });

    it('saves a valid issue successfully and returns 201 Created', async (t) => {
      t.mock.method(User, 'findById', () => ({
        select: async () => ({ _id: testUserId, name: 'Ada', email: 'ada@example.com' }),
      }));

      t.mock.method(SavedIssue, 'findOneAndUpdate', async (filter, update) => {
        assert.equal(filter.userId, testUserId);
        assert.equal(filter.number, 42);
        assert.equal(filter['repository.fullName'], 'facebook/react');
        return {
          _id: '662000000000000000000001',
          ...update.$setOnInsert,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `${env.COOKIE_NAME}=${sessionToken}`,
        },
        body: JSON.stringify({
          issueId: 987654,
          number: 42,
          title: 'Fix hydration error in SSR',
          htmlUrl: 'https://github.com/facebook/react/issues/42',
          bodySnippet: 'Detailed description of the issue',
          repository: {
            owner: 'facebook',
            name: 'react',
            fullName: 'facebook/react',
          },
          labels: [{ name: 'good-first-issue', color: '7057ff' }],
          notes: 'Look into component unmounting logic',
        }),
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.number, 42);
      assert.equal(json.data.title, 'Fix hydration error in SSR');
      assert.equal(json.data.status, 'saved');
    });
  });

  describe('GET /api/v1/saved-issues (List Issues)', () => {
    it('returns user saved issues list with pagination metadata', async (t) => {
      t.mock.method(User, 'findById', () => ({
        select: async () => ({ _id: testUserId, name: 'Ada', email: 'ada@example.com' }),
      }));

      t.mock.method(SavedIssue, 'countDocuments', async () => 1);
      t.mock.method(SavedIssue, 'find', () => ({
        sort: () => ({
          skip: () => ({
            limit: async () => [
              {
                id: '662000000000000000000001',
                number: 42,
                title: 'Fix hydration error in SSR',
                repository: { fullName: 'facebook/react' },
                status: 'saved',
              },
            ],
          }),
        }),
      }));

      const res = await fetch(`${baseUrl}?page=1&per_page=10`, {
        headers: { Cookie: `${env.COOKIE_NAME}=${sessionToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.length, 1);
      assert.equal(json.pagination.totalCount, 1);
      assert.equal(json.pagination.page, 1);
    });
  });

  describe('PATCH /api/v1/saved-issues/:id (Update Issue)', () => {
    it('updates notes and status successfully', async (t) => {
      t.mock.method(User, 'findById', () => ({
        select: async () => ({ _id: testUserId, name: 'Ada', email: 'ada@example.com' }),
      }));

      t.mock.method(SavedIssue, 'findOneAndUpdate', async (filter, update) => {
        assert.equal(filter._id, '662000000000000000000001');
        assert.equal(filter.userId, testUserId);
        assert.equal(update.$set.status, 'in_progress');
        assert.equal(update.$set.notes, 'Started branch fix-hydration');
        return {
          id: '662000000000000000000001',
          status: 'in_progress',
          notes: 'Started branch fix-hydration',
        };
      });

      const res = await fetch(`${baseUrl}/662000000000000000000001`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `${env.COOKIE_NAME}=${sessionToken}`,
        },
        body: JSON.stringify({
          status: 'in_progress',
          notes: 'Started branch fix-hydration',
        }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.status, 'in_progress');
    });

    it('rejects invalid status with 400 VALIDATION_ERROR', async (t) => {
      t.mock.method(User, 'findById', () => ({
        select: async () => ({ _id: testUserId, name: 'Ada', email: 'ada@example.com' }),
      }));

      const res = await fetch(`${baseUrl}/662000000000000000000001`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `${env.COOKIE_NAME}=${sessionToken}`,
        },
        body: JSON.stringify({ status: 'invalid_status' }),
      });

      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.error.code, 'VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/v1/saved-issues/:id (Delete Issue)', () => {
    it('deletes saved issue when owned by user', async (t) => {
      t.mock.method(User, 'findById', () => ({
        select: async () => ({ _id: testUserId, name: 'Ada', email: 'ada@example.com' }),
      }));

      t.mock.method(SavedIssue, 'findOneAndDelete', async (filter) => {
        assert.equal(filter._id, '662000000000000000000001');
        assert.equal(filter.userId, testUserId);
        return { _id: '662000000000000000000001' };
      });

      const res = await fetch(`${baseUrl}/662000000000000000000001`, {
        method: 'DELETE',
        headers: { Cookie: `${env.COOKIE_NAME}=${sessionToken}` },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.message, 'Saved issue removed successfully');
    });

    it('returns 404 NOT_FOUND when issue does not exist or belongs to another user', async (t) => {
      t.mock.method(User, 'findById', () => ({
        select: async () => ({ _id: testUserId, name: 'Ada', email: 'ada@example.com' }),
      }));

      t.mock.method(SavedIssue, 'findOneAndDelete', async () => null);

      const res = await fetch(`${baseUrl}/662000000000000000000099`, {
        method: 'DELETE',
        headers: { Cookie: `${env.COOKIE_NAME}=${sessionToken}` },
      });

      assert.equal(res.status, 404);
      const json = await res.json();
      assert.equal(json.error.code, 'NOT_FOUND');
    });
  });
});
