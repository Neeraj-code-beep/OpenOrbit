import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createApp } from '../app.js';
import { User } from '../models/user.model.js';
import { env } from '../config/env.js';

describe('Authentication & JWT System', () => {
  const app = createApp();
  let server;
  let port;
  let baseUrl;

  beforeEach(async () => {
    server = app.listen(0);
    port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/v1/auth`;
  });

  afterEach(async () => {
    if (server) {
      server.close();
    }
  });

  // Helper to build a mock user document
  function createMockUserDoc(overrides = {}) {
    const rawUser = {
      _id: '661000000000000000000001',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: '$2a$12$eX4mpleHashedPasswordForTestOnly9999999999999999999999',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      comparePassword: async (pass) => pass === 'ValidPassword123!',
      toSafeObject: function () {
        return {
          id: this._id.toString(),
          name: this.name,
          email: this.email,
          createdAt: this.createdAt,
          updatedAt: this.updatedAt,
        };
      },
      ...overrides,
    };
    return rawUser;
  }

  describe('POST /api/v1/auth/register', () => {
    it('registers a user successfully, sets HTTP-only cookie, and omits password', async (t) => {
      const mockUser = createMockUserDoc();

      t.mock.method(User, 'findOne', async () => null);
      t.mock.method(User, 'create', async (data) => {
        return createMockUserDoc({
          name: data.name,
          email: data.email,
        });
      });

      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Ada Lovelace',
          email: 'Ada@Example.com',
          password: 'SecurePassword123!',
        }),
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.user.name, 'Ada Lovelace');
      assert.equal(json.data.user.email, 'ada@example.com'); // normalized
      assert.equal(json.data.user.password, undefined); // password strictly excluded

      // Verify HTTP-only cookie
      const setCookie = res.headers.get('set-cookie');
      assert.ok(setCookie, 'Set-Cookie header must be present');
      assert.ok(setCookie.includes(env.COOKIE_NAME));
      assert.ok(setCookie.toLowerCase().includes('httponly'));
      assert.ok(setCookie.toLowerCase().includes('path=/'));
    });

    it('rejects registration with duplicate email (409 Conflict)', async (t) => {
      t.mock.method(User, 'findOne', async () => createMockUserDoc());

      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          password: 'SecurePassword123!',
        }),
      });

      assert.equal(res.status, 409);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'EMAIL_ALREADY_EXISTS');
    });

    it('rejects invalid inputs with 400 VALIDATION_ERROR', async () => {
      // Missing password, short name, invalid email
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'A',
          email: 'not-an-email',
          password: 'short',
        }),
      });

      assert.equal(res.status, 400);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'VALIDATION_ERROR');
      assert.ok(Array.isArray(json.error.details));
      assert.ok(json.error.details.length >= 2);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('authenticates valid credentials, sets HTTP-only cookie, and returns safe user', async (t) => {
      const mockUser = createMockUserDoc();

      t.mock.method(User, 'findOne', () => ({
        select: async () => mockUser,
      }));

      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'ada@example.com',
          password: 'ValidPassword123!',
        }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.user.email, 'ada@example.com');
      assert.equal(json.data.user.password, undefined);

      const setCookie = res.headers.get('set-cookie');
      assert.ok(setCookie);
      assert.ok(setCookie.includes(env.COOKIE_NAME));
      assert.ok(setCookie.toLowerCase().includes('httponly'));
    });

    it('returns generic 401 INVALID_CREDENTIALS for non-existent user', async (t) => {
      t.mock.method(User, 'findOne', () => ({
        select: async () => null,
      }));

      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'unknown@example.com',
          password: 'ValidPassword123!',
        }),
      });

      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'INVALID_CREDENTIALS');
      assert.equal(json.error.message, 'Invalid email or password');
    });

    it('returns generic 401 INVALID_CREDENTIALS for wrong password', async (t) => {
      const mockUser = createMockUserDoc({
        comparePassword: async () => false,
      });

      t.mock.method(User, 'findOne', () => ({
        select: async () => mockUser,
      }));

      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'ada@example.com',
          password: 'WrongPassword!',
        }),
      });

      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'INVALID_CREDENTIALS');
      assert.equal(json.error.message, 'Invalid email or password');
    });
  });

  describe('Protected /api/v1/auth/me Endpoint', () => {
    it('rejects unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const res = await fetch(`${baseUrl}/me`);
      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'UNAUTHORIZED');
    });

    it('rejects invalid/tampered JWT tokens with 401 INVALID_TOKEN', async () => {
      const res = await fetch(`${baseUrl}/me`, {
        headers: {
          Cookie: `${env.COOKIE_NAME}=invalid.tampered.token.here`,
        },
      });

      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'INVALID_TOKEN');
    });

    it('rejects expired JWT tokens with 401 TOKEN_EXPIRED', async () => {
      const expiredToken = jwt.sign(
        { sub: '661000000000000000000001', email: 'ada@example.com' },
        env.JWT_SECRET,
        { algorithm: env.JWT_ALGORITHM, expiresIn: -10 } // Expired 10 seconds ago
      );

      const res = await fetch(`${baseUrl}/me`, {
        headers: {
          Cookie: `${env.COOKIE_NAME}=${expiredToken}`,
        },
      });

      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'TOKEN_EXPIRED');
    });

    it('allows access with valid authentication cookie and returns user profile', async (t) => {
      const mockUser = createMockUserDoc();

      t.mock.method(User, 'findById', () => ({
        select: async () => mockUser,
      }));

      const validToken = jwt.sign(
        { sub: mockUser._id, email: mockUser.email },
        env.JWT_SECRET,
        { algorithm: env.JWT_ALGORITHM, expiresIn: '1h' }
      );

      const res = await fetch(`${baseUrl}/me`, {
        headers: {
          Cookie: `${env.COOKIE_NAME}=${validToken}`,
        },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.user.id, mockUser._id);
      assert.equal(json.data.user.email, mockUser.email);
      assert.equal(json.data.user.name, mockUser.name);
    });

    it('handles database failure during authentication with 500 DATABASE_ERROR', async (t) => {
      t.mock.method(User, 'findById', () => ({
        select: async () => {
          throw new Error('Connection pool exhausted');
        },
      }));

      const validToken = jwt.sign(
        { sub: '661000000000000000000001', email: 'ada@example.com' },
        env.JWT_SECRET,
        { algorithm: env.JWT_ALGORITHM, expiresIn: '1h' }
      );

      const res = await fetch(`${baseUrl}/me`, {
        headers: {
          Cookie: `${env.COOKIE_NAME}=${validToken}`,
        },
      });

      assert.equal(res.status, 500);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'DATABASE_ERROR');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('clears authentication cookie with matching cookie options', async () => {
      const res = await fetch(`${baseUrl}/logout`, {
        method: 'POST',
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.message, 'Logged out successfully');

      const setCookie = res.headers.get('set-cookie');
      assert.ok(setCookie, 'Set-Cookie header must be present on logout');
      assert.ok(setCookie.includes(env.COOKIE_NAME));
      // Standard cookie clearing sets expires in the past or max-age=0
      assert.ok(
        setCookie.toLowerCase().includes('max-age=0') ||
        setCookie.toLowerCase().includes('expires=thu, 01 jan 1970')
      );
      assert.ok(setCookie.toLowerCase().includes('httponly'));
      assert.ok(setCookie.toLowerCase().includes('path=/'));
    });
  });

  describe('User Model & Bcrypt Unit Tests', () => {
    it('hashes passwords and compares hashes correctly', async () => {
      const password = 'TestSecurePassword123!';
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      const isMatch = await bcrypt.compare(password, hash);
      assert.equal(isMatch, true);

      const isMismatch = await bcrypt.compare('WrongPassword999!', hash);
      assert.equal(isMismatch, false);
    });

    it('toSafeObject returns sanitized properties', () => {
      const doc = createMockUserDoc();
      const safe = doc.toSafeObject();
      assert.equal(safe.id, '661000000000000000000001');
      assert.equal(safe.name, 'Ada Lovelace');
      assert.equal(safe.email, 'ada@example.com');
      assert.equal(safe.password, undefined);
    });
  });
});
