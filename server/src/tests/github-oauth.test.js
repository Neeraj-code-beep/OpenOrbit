import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { User } from '../models/user.model.js';
import { env } from '../config/env.js';
import {
  initiateGitHubOAuth,
  validateOAuthState,
  sanitizeRedirectDestination,
  linkGitHubAccount,
  authenticateWithGitHub,
} from '../services/github/github-oauth.service.js';
import {
  decryptToken,
  createReauthTicket,
  hashReauthTicket,
} from '../utils/crypto.utils.js';

const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('GitHub App OAuth & Identity System', () => {
  const app = createApp();
  let server;
  let port;
  let baseUrl;

  // Save original env values
  const originalClientId = env.GITHUB_APP_CLIENT_ID;
  const originalClientSecret = env.GITHUB_APP_CLIENT_SECRET;
  const originalKey = env.GITHUB_ENCRYPTION_KEY;

  beforeEach(() => {
    // Configure test OAuth environment
    env.GITHUB_APP_CLIENT_ID = 'test-client-id-123';
    env.GITHUB_APP_CLIENT_SECRET = 'test-client-secret-xyz';
    env.GITHUB_ENCRYPTION_KEY = TEST_KEY;

    server = app.listen(0);
    port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}/api/v1/auth`;
  });

  afterEach(() => {
    // Restore env values
    env.GITHUB_APP_CLIENT_ID = originalClientId;
    env.GITHUB_APP_CLIENT_SECRET = originalClientSecret;
    env.GITHUB_ENCRYPTION_KEY = originalKey;

    if (server) {
      server.close();
    }
  });

  describe('Redirect Sanitization (Open Redirect Prevention)', () => {
    it('allows safe relative paths', () => {
      assert.equal(sanitizeRedirectDestination('/settings'), '/settings');
      assert.equal(sanitizeRedirectDestination('/issues?filter=good-first-issue'), '/issues?filter=good-first-issue');
    });

    it('rejects protocol-relative URLs (e.g. //evil.com)', () => {
      assert.equal(sanitizeRedirectDestination('//evil.com/phish'), '/');
    });

    it('rejects backslash evasion attempts', () => {
      assert.equal(sanitizeRedirectDestination('/\\evil.com'), '/');
    });

    it('rejects foreign origin URLs and defaults to root', () => {
      assert.equal(sanitizeRedirectDestination('https://attacker.com/steal'), '/');
    });

    it('allows full URL if matching CLIENT_ORIGIN', () => {
      assert.equal(sanitizeRedirectDestination(`${env.CLIENT_ORIGIN}/settings?tab=gh`), '/settings?tab=gh');
    });
  });

  describe('OAuth Initiation (State & PKCE)', () => {
    it('generates a valid GitHub authorization URL with PKCE S256 and encrypted state', () => {
      const { authorizationUrl, encryptedStateCookie } = initiateGitHubOAuth({
        intent: 'auth',
        redirectTo: '/settings',
        encryptionKey: TEST_KEY,
      });

      assert.ok(authorizationUrl.startsWith('https://github.com/login/oauth/authorize'));
      const parsedUrl = new URL(authorizationUrl);
      assert.equal(parsedUrl.searchParams.get('client_id'), 'test-client-id-123');
      assert.equal(parsedUrl.searchParams.get('redirect_uri'), env.GITHUB_APP_CALLBACK_URL);
      assert.equal(parsedUrl.searchParams.get('scope'), 'read:user,user:email');
      assert.equal(parsedUrl.searchParams.get('code_challenge_method'), 'S256');

      const state = parsedUrl.searchParams.get('state');
      assert.ok(state && state.length === 64);

      // Verify encrypted state cookie can be decrypted
      const decrypted = JSON.parse(decryptToken(encryptedStateCookie, TEST_KEY));
      assert.equal(decrypted.state, state);
      assert.ok(decrypted.codeVerifier && decrypted.codeVerifier.length >= 43);
      assert.equal(decrypted.intent, 'auth');
      assert.equal(decrypted.redirectTo, '/settings');
    });

    it('fails initiation when GitHub App credentials are not configured', () => {
      env.GITHUB_APP_CLIENT_ID = '';
      assert.throws(() => initiateGitHubOAuth({ encryptionKey: TEST_KEY }), {
        name: 'AppError',
        code: 'GITHUB_AUTH_NOT_CONFIGURED',
      });
    });

    it('fails initiation when encryption key is missing', () => {
      assert.throws(() => initiateGitHubOAuth({ encryptionKey: '' }), {
        name: 'AppError',
        code: 'CRYPTO_KEY_MISSING',
      });
    });
  });

  describe('OAuth State Validation & Replay Prevention', () => {
    it('validates state correctly when query state matches cookie', () => {
      const { authorizationUrl, encryptedStateCookie } = initiateGitHubOAuth({
        intent: 'auth',
        encryptionKey: TEST_KEY,
      });
      const parsedUrl = new URL(authorizationUrl);
      const stateParam = parsedUrl.searchParams.get('state');

      const payload = validateOAuthState(stateParam, encryptedStateCookie, TEST_KEY);
      assert.equal(payload.state, stateParam);
      assert.equal(payload.intent, 'auth');
    });

    it('rejects state mismatch (CSRF defense)', () => {
      const { encryptedStateCookie } = initiateGitHubOAuth({ encryptionKey: TEST_KEY });
      assert.throws(() => validateOAuthState('wrong-state-parameter', encryptedStateCookie, TEST_KEY), {
        name: 'AppError',
        code: 'OAUTH_STATE_MISMATCH',
      });
    });

    it('rejects missing state parameter or missing cookie', () => {
      const { encryptedStateCookie } = initiateGitHubOAuth({ encryptionKey: TEST_KEY });
      assert.throws(() => validateOAuthState('', encryptedStateCookie, TEST_KEY), {
        name: 'AppError',
        code: 'INVALID_OAUTH_STATE',
      });
      assert.throws(() => validateOAuthState('some-state', '', TEST_KEY), {
        name: 'AppError',
        code: 'MISSING_OAUTH_STATE_COOKIE',
      });
    });

    it('rejects tampered state cookie', () => {
      const { authorizationUrl, encryptedStateCookie } = initiateGitHubOAuth({ encryptionKey: TEST_KEY });
      const state = new URL(authorizationUrl).searchParams.get('state');
      const tamperedCookie = encryptedStateCookie.slice(0, -4) + 'ffff';

      assert.throws(() => validateOAuthState(state, tamperedCookie, TEST_KEY), {
        name: 'AppError',
        code: 'INVALID_OAUTH_STATE_COOKIE',
      });
    });
  });

  describe('Reauthentication Ticket Issuance (POST /api/v1/auth/reauth)', () => {
    it('issues single-use ticket when authenticated user supplies correct password', async (t) => {
      const mockUser = {
        _id: '661000000000000000000001',
        password: '$2a$12$fakeHashedPassword',
        comparePassword: async (p) => p === 'CorrectPassword123!',
        save: async () => {},
      };

      t.mock.method(User, 'findById', () => ({
        select: async () => mockUser,
      }));

      const sessionToken = jwt.sign(
        { sub: mockUser._id, email: 'ada@example.com' },
        env.JWT_SECRET,
        { algorithm: env.JWT_ALGORITHM, expiresIn: '1h' }
      );

      const res = await fetch(`${baseUrl}/reauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `${env.COOKIE_NAME}=${sessionToken}`,
        },
        body: JSON.stringify({ password: 'CorrectPassword123!' }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.ticket && json.data.ticket.length === 64);
      assert.ok(mockUser.reauthTicketHash && mockUser.reauthTicketHash.length === 64);
      assert.equal(hashReauthTicket(json.data.ticket), mockUser.reauthTicketHash);
    });

    it('rejects reauth with incorrect password (401 INVALID_CREDENTIALS)', async (t) => {
      const mockUser = {
        _id: '661000000000000000000001',
        password: '$2a$12$fakeHashedPassword',
        comparePassword: async () => false,
      };

      t.mock.method(User, 'findById', () => ({
        select: async () => mockUser,
      }));

      const sessionToken = jwt.sign(
        { sub: mockUser._id, email: 'ada@example.com' },
        env.JWT_SECRET,
        { algorithm: env.JWT_ALGORITHM, expiresIn: '1h' }
      );

      const res = await fetch(`${baseUrl}/reauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `${env.COOKIE_NAME}=${sessionToken}`,
        },
        body: JSON.stringify({ password: 'WrongPassword!' }),
      });

      assert.equal(res.status, 401);
      const json = await res.json();
      assert.equal(json.error.code, 'INVALID_CREDENTIALS');
    });
  });

  describe('Account Linking with Reauth Ticket (linkGitHubAccount)', () => {
    it('links GitHub identity and encrypts tokens when valid ticket is consumed atomically', async (t) => {
      const ticketObj = createReauthTicket(300000);
      const userId = '661000000000000000000001';

      t.mock.method(User, 'findOne', async () => null); // No collision
      t.mock.method(User, 'findOneAndUpdate', async (filter, update) => {
        // Verify atomic filter includes ticket hash and unexpired timestamp
        assert.equal(filter._id, userId);
        assert.equal(filter.reauthTicketHash, ticketObj.hash);
        assert.ok(filter.reauthTicketExpiresAt.$gt);

        // Verify update nullifies ticket and encrypts token
        assert.equal(update.$set.reauthTicketHash, null);
        assert.equal(update.$set.reauthTicketExpiresAt, null);
        assert.equal(update.$set.githubId, '123456');
        assert.ok(update.$set.githubAccessTokenEncrypted.startsWith('enc:v1:'));
        assert.deepEqual(update.$addToSet, { authProviders: 'github' });

        return { _id: userId, githubId: '123456' };
      });

      const updated = await linkGitHubAccount({
        userId,
        reauthTicket: ticketObj.ticket,
        ghProfile: {
          id: '123456',
          login: 'octocat',
          avatarUrl: 'https://github.com/images/error/octocat_happy.gif',
          profileUrl: 'https://github.com/octocat',
        },
        tokenData: {
          access_token: 'ghu_sample_access_token_123',
          refresh_token: 'ghr_sample_refresh_token_xyz',
          expires_in: 28800,
          scope: 'read:user,user:email',
        },
        encryptionKey: TEST_KEY,
      });

      assert.equal(updated.githubId, '123456');
    });

    it('rejects linking when GitHub account is already bound to another user (409 Conflict)', async (t) => {
      const ticketObj = createReauthTicket(300000);
      const userId = '661000000000000000000001';

      // Conflicting user already owns githubId 123456
      t.mock.method(User, 'findOne', async () => ({
        _id: '661000000000000000000099', // Different user ID
        githubId: '123456',
      }));

      await assert.rejects(
        async () => {
          await linkGitHubAccount({
            userId,
            reauthTicket: ticketObj.ticket,
            ghProfile: { id: '123456', login: 'octocat' },
            tokenData: { access_token: 'ghu_token' },
            encryptionKey: TEST_KEY,
          });
        },
        {
          name: 'AppError',
          code: 'GITHUB_ACCOUNT_ALREADY_LINKED',
        }
      );
    });

    it('rejects linking when ticket has already been used or expired', async (t) => {
      const userId = '661000000000000000000001';

      t.mock.method(User, 'findOne', async () => null);
      // findOneAndUpdate returns null because ticket hash didn't match (already consumed)
      t.mock.method(User, 'findOneAndUpdate', async () => null);
      t.mock.method(User, 'findById', async () => ({ _id: userId }));

      await assert.rejects(
        async () => {
          await linkGitHubAccount({
            userId,
            reauthTicket: 'expired_or_replayed_ticket',
            ghProfile: { id: '123456', login: 'octocat' },
            tokenData: { access_token: 'ghu_token' },
            encryptionKey: TEST_KEY,
          });
        },
        {
          name: 'AppError',
          code: 'REAUTH_TICKET_INVALID',
        }
      );
    });
  });

  describe('Sign-in & Registration Rules (authenticateWithGitHub)', () => {
    it('creates new GitHub-only account without password when user does not exist', async (t) => {
      t.mock.method(User, 'findOne', async () => null); // No existing account by githubId or email
      t.mock.method(User, 'create', async (doc) => {
        assert.equal(doc.password, null);
        assert.deepEqual(doc.authProviders, ['github']);
        assert.equal(doc.githubId, '78910');
        assert.ok(doc.githubAccessTokenEncrypted.startsWith('enc:v1:'));
        return {
          _id: '661000000000000000000002',
          email: doc.email,
          ...doc,
        };
      });

      const { user, isNewUser } = await authenticateWithGitHub({
        ghProfile: {
          id: '78910',
          login: 'newcoder',
          name: 'New Coder',
          email: 'coder@example.com',
          avatarUrl: 'https://avatar.url',
          profileUrl: 'https://github.com/newcoder',
        },
        tokenData: {
          access_token: 'ghu_new_token',
        },
        encryptionKey: TEST_KEY,
      });

      assert.equal(isNewUser, true);
      assert.equal(user.githubId, '78910');
      assert.equal(user.password, null);
    });

    it('NEVER silently auto-links accounts when email matches existing local user', async (t) => {
      // No user with githubId '555', but a local user with email 'existing@example.com' exists
      t.mock.method(User, 'findOne', async (query) => {
        if (query.email === 'existing@example.com') {
          return {
            _id: '661000000000000000000003',
            email: 'existing@example.com',
            authProviders: ['local'],
          };
        }
        return null;
      });

      await assert.rejects(
        async () => {
          await authenticateWithGitHub({
            ghProfile: {
              id: '555',
              login: 'someone',
              email: 'existing@example.com',
            },
            tokenData: { access_token: 'ghu_token' },
            encryptionKey: TEST_KEY,
          });
        },
        {
          name: 'AppError',
          code: 'ACCOUNT_EXISTS_REQUIRES_LINK',
        }
      );
    });

    it('logs in existing GitHub user and updates encrypted tokens', async (t) => {
      const existingUser = {
        _id: '661000000000000000000004',
        email: 'ghuser@example.com',
        githubId: '999',
        githubTokenVersion: 1,
        save: async function () {
          this.saved = true;
        },
      };

      t.mock.method(User, 'findOne', async () => existingUser);

      const { user, isNewUser } = await authenticateWithGitHub({
        ghProfile: {
          id: '999',
          login: 'existinguser',
        },
        tokenData: {
          access_token: 'ghu_refreshed_token',
        },
        encryptionKey: TEST_KEY,
      });

      assert.equal(isNewUser, false);
      assert.equal(user._id, existingUser._id);
      assert.equal(user.githubTokenVersion, 2); // Increment token version
      assert.ok(user.githubAccessTokenEncrypted.startsWith('enc:v1:'));
      assert.equal(user.saved, true);
    });
  });

  describe('Route-Level Integration Tests (GET /api/v1/auth/github & callback)', () => {
    it('GET /api/v1/auth/github redirects to GitHub with set-cookie', async () => {
      const res = await fetch(`${baseUrl}/github?redirect_to=/issues`, {
        redirect: 'manual', // Inspect 302 redirect response
      });

      assert.equal(res.status, 302);
      const location = res.headers.get('location');
      assert.ok(location.startsWith('https://github.com/login/oauth/authorize'));

      const setCookie = res.headers.get('set-cookie');
      assert.ok(setCookie.includes('openorbit_oauth_state'));
      assert.ok(setCookie.toLowerCase().includes('httponly'));
      assert.ok(setCookie.toLowerCase().includes('samesite=lax'));
    });

    it('GET /api/v1/auth/github?link=true requires active session and reauth ticket', async () => {
      // No session
      const res1 = await fetch(`${baseUrl}/github?link=true`, { redirect: 'manual' });
      assert.equal(res1.status, 401);

      // Session without ticket
      const sessionToken = jwt.sign(
        { sub: '661000000000000000000001', email: 'ada@example.com' },
        env.JWT_SECRET,
        { algorithm: env.JWT_ALGORITHM, expiresIn: '1h' }
      );

      const res2 = await fetch(`${baseUrl}/github?link=true`, {
        redirect: 'manual',
        headers: { Cookie: `${env.COOKIE_NAME}=${sessionToken}` },
      });
      assert.equal(res2.status, 403);
      const json2 = await res2.json();
      assert.equal(json2.error.code, 'REAUTH_REQUIRED');
    });

    it('GET /api/v1/auth/github/callback redirects to frontend on user denial with auth_error=ACCESS_DENIED', async () => {
      const res = await fetch(`${baseUrl}/github/callback?error=access_denied&error_description=The+user+has+denied+your+application`, {
        redirect: 'manual',
      });

      assert.equal(res.status, 302);
      const location = res.headers.get('location');
      assert.ok(location.startsWith(env.CLIENT_ORIGIN));
      assert.ok(location.includes('auth_error=ACCESS_DENIED'));

      // Verifies temporary state cookie is cleared
      const setCookie = res.headers.get('set-cookie');
      assert.ok(setCookie && setCookie.includes('openorbit_oauth_state'));
    });

    it('GET /api/v1/auth/github/callback redirects with INVALID_STATE when state is missing or mismatched', async () => {
      const res = await fetch(`${baseUrl}/github/callback?code=some_code&state=fake_state`, {
        redirect: 'manual',
      });

      assert.equal(res.status, 302);
      const location = res.headers.get('location');
      assert.ok(location.includes('auth_error='));
    });

    it('GET /api/v1/auth/github/callback for link intent rejects if active session is missing', async () => {
      // Craft a valid encrypted link state cookie
      const { authorizationUrl, encryptedStateCookie } = initiateGitHubOAuth({
        intent: 'link',
        userId: '661000000000000000000001',
        reauthTicket: 'sample_ticket_123',
        encryptionKey: TEST_KEY,
      });
      const state = new URL(authorizationUrl).searchParams.get('state');

      // Request callback without an active openorbit_token session cookie
      const res = await fetch(`${baseUrl}/github/callback?code=sample_code&state=${state}`, {
        redirect: 'manual',
        headers: {
          Cookie: `openorbit_oauth_state=${encryptedStateCookie}`,
        },
      });

      assert.equal(res.status, 302);
      const location = res.headers.get('location');
      assert.ok(location.includes('auth_error=UNAUTHORIZED'));
    });

    it('GET /api/v1/auth/github/callback redirects to frontend with auth_success on successful sign-in', async (t) => {
      const { authorizationUrl, encryptedStateCookie } = initiateGitHubOAuth({
        intent: 'auth',
        redirectTo: '/dashboard',
        encryptionKey: TEST_KEY,
      });
      const state = new URL(authorizationUrl).searchParams.get('state');

      const originalFetch = global.fetch;
      t.after(() => { global.fetch = originalFetch; });

      const mockUser = {
        _id: '661000000000000000000001',
        email: 'dev@example.com',
        githubId: '998877',
        githubUsername: 'octo-dev',
        authProviders: ['github'],
        save: async function () { return this; },
        toSafeObject: () => ({ id: '661000000000000000000001', email: 'dev@example.com' }),
      };
      t.mock.method(User, 'findOne', async () => mockUser);

      global.fetch = async (url, opts) => {
        const urlStr = String(url);
        if (urlStr.includes('login/oauth/access_token')) {
          return new Response(JSON.stringify({
            access_token: 'gho_mock_access_token_12345',
            token_type: 'bearer',
            scope: 'read:user,user:email',
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (urlStr.includes('api.github.com/user/emails')) {
          return new Response(JSON.stringify([
            { email: 'dev@example.com', primary: true, verified: true },
          ]), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (urlStr.includes('api.github.com/user')) {
          return new Response(JSON.stringify({
            id: 998877,
            login: 'octo-dev',
            name: 'Octo Developer',
            email: 'dev@example.com',
            avatar_url: 'https://avatars.githubusercontent.com/u/998877',
            html_url: 'https://github.com/octo-dev',
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return originalFetch(url, opts);
      };

      const res = await fetch(`${baseUrl}/github/callback?code=mock_oauth_code&state=${state}`, {
        redirect: 'manual',
        headers: {
          Cookie: `openorbit_oauth_state=${encryptedStateCookie}`,
        },
      });

      assert.equal(res.status, 302);
      const location = res.headers.get('location');
      assert.ok(location, 'Expected redirect location header');
      assert.ok(location.includes('auth_success=logged_in'), `Expected auth_success=logged_in in ${location}`);
      const setCookie = res.headers.get('set-cookie');
      assert.ok(setCookie && setCookie.includes(env.COOKIE_NAME), 'Expected session cookie to be set');
    });

    it('authenticateWithGitHub and linkGitHubAccount throw CRYPTO_KEY_MISSING when key is empty', async () => {
      await assert.rejects(
        async () => {
          await authenticateWithGitHub({
            ghProfile: { id: '1' },
            tokenData: { access_token: 'tok' },
            encryptionKey: '',
          });
        },
        { name: 'AppError', code: 'CRYPTO_KEY_MISSING' }
      );

      await assert.rejects(
        async () => {
          await linkGitHubAccount({
            userId: '123',
            reauthTicket: 'tic',
            ghProfile: { id: '1' },
            tokenData: { access_token: 'tok' },
            encryptionKey: '',
          });
        },
        { name: 'AppError', code: 'CRYPTO_KEY_MISSING' }
      );
    });
  });
});
