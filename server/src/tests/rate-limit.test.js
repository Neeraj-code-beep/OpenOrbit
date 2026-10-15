import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRateLimiter,
  getClientIp,
  MemoryRateLimiterStore,
} from '../middleware/rate-limit.middleware.js';
import {
  createActionApprovalToken,
  verifyActionApprovalToken,
} from '../utils/crypto.utils.js';

describe('Rate Limiter Middleware', () => {
  let limiter;

  beforeEach(() => {
    limiter = createRateLimiter({
      windowMs: 1000, // 1 second window
      max: 3, // 3 requests max
      message: 'Rate limit test hit',
      prefix: 'test-rl',
    });
    limiter.reset();
  });

  it('allows requests within the configured threshold and sets rate limit headers', (t, done) => {
    const req = {
      ip: '192.168.1.10',
      headers: {},
      id: 'req-1',
    };
    const headers = {};
    const res = {
      setHeader: (k, v) => {
        headers[k] = v;
      },
    };

    limiter(req, res, (err) => {
      assert.equal(err, undefined);
      assert.equal(headers['RateLimit-Limit'], 3);
      assert.equal(headers['RateLimit-Remaining'], 2);
      assert.ok(headers['RateLimit-Reset'] > 0);
      done();
    });
  });

  it('enforces limit and returns 429 AppError when threshold is exceeded', () => {
    const req = {
      ip: '192.168.1.20',
      headers: {},
      id: 'req-rate-limit',
    };
    const headers = {};
    const res = {
      setHeader: (k, v) => {
        headers[k] = v;
      },
    };

    // First 3 requests should pass
    for (let i = 0; i < 3; i++) {
      let passed = false;
      limiter(req, res, (err) => {
        assert.equal(err, undefined);
        passed = true;
      });
      assert.ok(passed);
    }

    // 4th request must return 429 AppError
    let caughtErr = null;
    limiter(req, res, (err) => {
      caughtErr = err;
    });

    assert.ok(caughtErr);
    assert.equal(caughtErr.statusCode, 429);
    assert.equal(caughtErr.code, 'RATE_LIMIT_EXCEEDED');
    assert.equal(caughtErr.message, 'Rate limit test hit');
    assert.equal(headers['Retry-After'], 1);
  });

  it('isolates counters between different client IPs', () => {
    const req1 = { ip: '10.0.0.1', headers: {}, id: 'req-ip1' };
    const req2 = { ip: '10.0.0.2', headers: {}, id: 'req-ip2' };
    const res = { setHeader: () => {} };

    // Max out req1
    for (let i = 0; i < 3; i++) {
      limiter(req1, res, () => {});
    }

    let req1Err = null;
    limiter(req1, res, (err) => {
      req1Err = err;
    });
    assert.ok(req1Err);
    assert.equal(req1Err.statusCode, 429);

    // req2 should still pass untouched
    let req2Err = null;
    limiter(req2, res, (err) => {
      req2Err = err;
    });
    assert.equal(req2Err, undefined);
  });

  it('getClientIp extracts first IP from X-Forwarded-For header', () => {
    const req = {
      headers: {
        'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
      },
      ip: '127.0.0.1',
    };
    assert.equal(getClientIp(req), '203.0.113.195');
  });

  it('MemoryRateLimiterStore cleanups expired entries correctly', async () => {
    const store = new MemoryRateLimiterStore(50);
    const entry = store.increment('expire-key', 50);
    assert.equal(entry.count, 1);

    // Wait for entry to expire
    await new Promise((r) => setTimeout(r, 60));
    store.cleanup();
    assert.equal(store.get('expire-key'), undefined);
    store.destroy();
  });
});

describe('Consequential Action Approval Tokens', () => {
  const secretKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const userId = 'user_6610000001';
  const tool = 'github_create_pull_request';
  const args = {
    owner: 'octocat',
    repo: 'hello-world',
    title: 'Fix typo',
    head: 'patch-1',
    base: 'main',
  };

  it('creates and verifies a valid cryptographic approval token', () => {
    const token = createActionApprovalToken({ userId, tool, args }, secretKey, 60000);
    assert.ok(typeof token === 'string');
    assert.ok(token.includes('.'));

    const verification = verifyActionApprovalToken(token, { userId, tool, args }, secretKey);
    assert.equal(verification.valid, true);
  });

  it('rejects approval token when tool name does not match', () => {
    const token = createActionApprovalToken({ userId, tool, args }, secretKey);
    const verification = verifyActionApprovalToken(
      token,
      { userId, tool: 'github_create_issue_comment', args },
      secretKey
    );
    assert.equal(verification.valid, false);
    assert.match(verification.error, /tool mismatch/i);
  });

  it('rejects approval token when userId does not match', () => {
    const token = createActionApprovalToken({ userId, tool, args }, secretKey);
    const verification = verifyActionApprovalToken(
      token,
      { userId: 'different_user_999', tool, args },
      secretKey
    );
    assert.equal(verification.valid, false);
    assert.match(verification.error, /user mismatch/i);
  });

  it('rejects approval token when arguments are tampered with after approval', () => {
    const token = createActionApprovalToken({ userId, tool, args }, secretKey);
    const tamperedArgs = { ...args, head: 'malicious-branch' };
    const verification = verifyActionApprovalToken(
      token,
      { userId, tool, args: tamperedArgs },
      secretKey
    );
    assert.equal(verification.valid, false);
    assert.match(verification.error, /arguments mismatch/i);
  });

  it('rejects approval token with forged HMAC signature', () => {
    const token = createActionApprovalToken({ userId, tool, args }, secretKey);
    const [payload] = token.split('.');
    const forgedToken = `${payload}.forged_bad_signature_00000000000000000000`;

    const verification = verifyActionApprovalToken(forgedToken, { userId, tool, args }, secretKey);
    assert.equal(verification.valid, false);
    assert.match(verification.error, /Invalid or forged approval token/i);
  });

  it('rejects approval token after expiration', () => {
    // 1ms TTL token
    const token = createActionApprovalToken({ userId, tool, args }, secretKey, -100);
    const verification = verifyActionApprovalToken(token, { userId, tool, args }, secretKey);
    assert.equal(verification.valid, false);
    assert.match(verification.error, /expired/i);
  });
});
