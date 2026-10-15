import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  validateEncryptionKey,
  encryptToken,
  decryptToken,
  generatePkceChallenge,
  generateOauthState,
  createReauthTicket,
  hashReauthTicket,
} from '../utils/crypto.utils.js';
import { User } from '../models/user.model.js';

describe('Cryptographic Utilities & Key Management', () => {
  const testKeyHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const alternateKeyHex = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';

  describe('Key Validation', () => {
    it('accepts valid 64-character hex key and returns 32-byte Buffer', () => {
      const buffer = validateEncryptionKey(testKeyHex);
      assert.ok(Buffer.isBuffer(buffer));
      assert.equal(buffer.length, 32);
    });

    it('rejects keys with invalid lengths', () => {
      assert.throws(() => validateEncryptionKey('tooshort'), {
        name: 'AppError',
        code: 'CRYPTO_KEY_INVALID',
      });
      assert.throws(() => validateEncryptionKey(testKeyHex + 'ab'), {
        name: 'AppError',
        code: 'CRYPTO_KEY_INVALID',
      });
    });

    it('rejects keys with non-hexadecimal characters', () => {
      const invalidHex = testKeyHex.slice(0, 62) + 'ZZ';
      assert.throws(() => validateEncryptionKey(invalidHex), {
        name: 'AppError',
        code: 'CRYPTO_KEY_INVALID',
      });
    });

    it('rejects null or non-string keys', () => {
      assert.throws(() => validateEncryptionKey(null), {
        name: 'AppError',
        code: 'CRYPTO_KEY_INVALID',
      });
      assert.throws(() => validateEncryptionKey(12345), {
        name: 'AppError',
        code: 'CRYPTO_KEY_INVALID',
      });
    });
  });

  describe('AES-256-GCM Token Encryption & Decryption', () => {
    const rawToken = 'ghu_16CharSampleUserTokenForTestingOpenOrbit0123456789';

    it('encrypts plaintext into versioned authenticated payload', () => {
      const encrypted = encryptToken(rawToken, testKeyHex, 'v1');
      assert.ok(typeof encrypted === 'string');
      assert.ok(encrypted.startsWith('enc:v1:'));

      const parts = encrypted.split(':');
      assert.equal(parts.length, 5);
      assert.equal(parts[0], 'enc');
      assert.equal(parts[1], 'v1');
      assert.equal(parts[2].length, 24); // 12-byte IV in hex = 24 chars
      assert.equal(parts[3].length, 32); // 16-byte Auth Tag in hex = 32 chars
    });

    it('decrypts encrypted payload back to identical plaintext', () => {
      const encrypted = encryptToken(rawToken, testKeyHex, 'v1');
      const decrypted = decryptToken(encrypted, testKeyHex);
      assert.equal(decrypted, rawToken);
    });

    it('generates unique IV and ciphertext on subsequent encryptions of same plaintext', () => {
      const enc1 = encryptToken(rawToken, testKeyHex);
      const enc2 = encryptToken(rawToken, testKeyHex);
      assert.notEqual(enc1, enc2);
      assert.equal(decryptToken(enc1, testKeyHex), rawToken);
      assert.equal(decryptToken(enc2, testKeyHex), rawToken);
    });

    it('fails decryption if wrong key is used (authentication tag mismatch)', () => {
      const encrypted = encryptToken(rawToken, testKeyHex);
      assert.throws(() => decryptToken(encrypted, alternateKeyHex), {
        name: 'AppError',
        code: 'CRYPTO_DECRYPT_FAILED',
      });
    });

    it('fails decryption if ciphertext has been tampered with', () => {
      const encrypted = encryptToken(rawToken, testKeyHex);
      const parts = encrypted.split(':');
      // Tamper last character of ciphertext
      const lastChar = parts[4].slice(-1);
      const flippedChar = lastChar === 'a' ? 'b' : 'a';
      parts[4] = parts[4].slice(0, -1) + flippedChar;
      const tampered = parts.join(':');

      assert.throws(() => decryptToken(tampered, testKeyHex), {
        name: 'AppError',
        code: 'CRYPTO_DECRYPT_FAILED',
      });
    });

    it('fails decryption if auth tag has been tampered with', () => {
      const encrypted = encryptToken(rawToken, testKeyHex);
      const parts = encrypted.split(':');
      // Tamper with auth tag
      parts[3] = '00'.repeat(16);
      const tampered = parts.join(':');

      assert.throws(() => decryptToken(tampered, testKeyHex), {
        name: 'AppError',
        code: 'CRYPTO_DECRYPT_FAILED',
      });
    });

    it('rejects malformed payload formats', () => {
      assert.throws(() => decryptToken('invalid-not-enc-format', testKeyHex), {
        name: 'AppError',
        code: 'CRYPTO_PAYLOAD_INVALID',
      });
      assert.throws(() => decryptToken('', testKeyHex), {
        name: 'AppError',
        code: 'CRYPTO_ERROR',
      });
    });

    it('rejects payloads with truncated IV or auth tag', () => {
      // Short IV (4 hex chars = 2 bytes instead of 24 hex chars = 12 bytes)
      assert.throws(() => decryptToken('enc:v1:abcd:' + '00'.repeat(16) + ':aabbcc', testKeyHex), {
        name: 'AppError',
        code: 'CRYPTO_DECRYPT_FAILED',
      });
      // Short auth tag (4 hex chars = 2 bytes instead of 32 hex chars = 16 bytes)
      assert.throws(() => decryptToken('enc:v1:' + '00'.repeat(12) + ':abcd:aabbcc', testKeyHex), {
        name: 'AppError',
        code: 'CRYPTO_DECRYPT_FAILED',
      });
    });

    it('rejects empty string plaintext for encryption', () => {
      assert.throws(() => encryptToken('', testKeyHex), {
        name: 'AppError',
        code: 'CRYPTO_ERROR',
      });
    });
  });

  describe('RFC 7636 PKCE Challenge Generation', () => {
    it('generates high-entropy code_verifier and matching S256 code_challenge', () => {
      const pkce = generatePkceChallenge();
      assert.equal(pkce.method, 'S256');
      assert.ok(typeof pkce.codeVerifier === 'string');
      assert.ok(typeof pkce.codeChallenge === 'string');

      // RFC 7636 min length is 43 chars
      assert.ok(pkce.codeVerifier.length >= 43);

      // Verify SHA256 base64url derivation
      const expectedChallenge = crypto
        .createHash('sha256')
        .update(pkce.codeVerifier)
        .digest('base64url');
      assert.equal(pkce.codeChallenge, expectedChallenge);
    });

    it('generates distinct PKCE pairs on successive calls', () => {
      const p1 = generatePkceChallenge();
      const p2 = generatePkceChallenge();
      assert.notEqual(p1.codeVerifier, p2.codeVerifier);
      assert.notEqual(p1.codeChallenge, p2.codeChallenge);
    });
  });

  describe('OAuth State Generation', () => {
    it('generates 64-character hexadecimal state strings', () => {
      const s1 = generateOauthState();
      const s2 = generateOauthState();
      assert.equal(s1.length, 64);
      assert.ok(/^[0-9a-f]{64}$/.test(s1));
      assert.notEqual(s1, s2);
    });
  });

  describe('Reauthentication Tickets', () => {
    it('creates a reauth ticket with hash and 5-minute expiration', () => {
      const before = Date.now();
      const ticketObj = createReauthTicket(300000);
      const after = Date.now();

      assert.ok(typeof ticketObj.ticket === 'string');
      assert.equal(ticketObj.ticket.length, 64);
      assert.ok(typeof ticketObj.hash === 'string');
      assert.equal(ticketObj.hash.length, 64);

      // Check hash calculation
      const computedHash = hashReauthTicket(ticketObj.ticket);
      assert.equal(ticketObj.hash, computedHash);

      // Check expiry is ~5 minutes in the future
      const expiryMs = ticketObj.expiresAt.getTime();
      assert.ok(expiryMs >= before + 300000 && expiryMs <= after + 300000);
    });

    it('rejects hashing empty or invalid tickets', () => {
      assert.throws(() => hashReauthTicket(''), {
        name: 'AppError',
        code: 'INVALID_TICKET',
      });
      assert.throws(() => hashReauthTicket(null), {
        name: 'AppError',
        code: 'INVALID_TICKET',
      });
    });
  });

  describe('User Model Schema Backward Compatibility', () => {
    it('creates local user doc requiring password', async () => {
      const user = new User({
        name: 'Local User',
        email: 'local@example.com',
        authProviders: ['local'],
      });

      let err;
      try {
        await user.validate();
      } catch (validationError) {
        err = validationError;
      }
      assert.ok(err);
      assert.ok(err.errors.password, 'Password must be required for local account');
    });

    it('allows GitHub OAuth user to be valid without password', async () => {
      const user = new User({
        name: 'GitHub User',
        email: 'github@example.com',
        authProviders: ['github'],
        githubId: '12345678',
        githubUsername: 'octocat',
      });

      let err = null;
      try {
        await user.validate();
      } catch (validationError) {
        err = validationError;
      }
      assert.equal(err, null, 'GitHub-only user must be valid without password');
    });

    it('sanitizes encrypted tokens and ticket hashes in toSafeObject', () => {
      const user = new User({
        name: 'GitHub User',
        email: 'github@example.com',
        authProviders: ['github'],
        githubId: '12345678',
        githubUsername: 'octocat',
        githubAccessTokenEncrypted: 'enc:v1:fake:fake:fake',
        githubRefreshTokenEncrypted: 'enc:v1:fake:fake:fake',
        reauthTicketHash: 'fakehash123',
      });

      const safe = user.toSafeObject();
      assert.equal(safe.name, 'GitHub User');
      assert.equal(safe.email, 'github@example.com');
      assert.equal(safe.githubConnected, true);
      assert.equal(safe.githubUsername, 'octocat');
      assert.equal(safe.hasPassword, false);
      assert.equal(safe.githubAccessTokenEncrypted, undefined);
      assert.equal(safe.githubRefreshTokenEncrypted, undefined);
      assert.equal(safe.reauthTicketHash, undefined);
      assert.deepEqual(safe.authProviders, ['github']);
    });

    it('toJSON and toObject transforms strip all sensitive fields', () => {
      const user = new User({
        name: 'Transform Test',
        email: 'transform@example.com',
        password: 'hashed_placeholder',
        authProviders: ['local', 'github'],
        githubId: '99999',
        githubAccessTokenEncrypted: 'enc:v1:iv:tag:ct',
        githubRefreshTokenEncrypted: 'enc:v1:iv:tag:ct',
        githubTokenExpiresAt: new Date(),
        githubRefreshTokenExpiresAt: new Date(),
        githubKeyVersion: 'v1',
        githubScopes: ['repo'],
        githubTokenVersion: 3,
        githubTokenRefreshingUntil: new Date(),
        reauthTicketHash: 'sha256hash',
        reauthTicketExpiresAt: new Date(),
      });

      const json = user.toJSON();
      const obj = user.toObject();

      const sensitiveFields = [
        'password', '_id', '__v',
        'reauthTicketHash', 'reauthTicketExpiresAt',
        'githubAccessTokenEncrypted', 'githubRefreshTokenEncrypted',
        'githubTokenExpiresAt', 'githubRefreshTokenExpiresAt',
        'githubKeyVersion', 'githubScopes',
        'githubTokenVersion', 'githubTokenRefreshingUntil',
      ];

      for (const field of sensitiveFields) {
        assert.equal(json[field], undefined, `toJSON must not contain ${field}`);
        assert.equal(obj[field], undefined, `toObject must not contain ${field}`);
      }

      // Safe fields should still be present
      assert.equal(json.name, 'Transform Test');
      assert.ok(json.id, 'toJSON must include id');
      assert.equal(obj.name, 'Transform Test');
      assert.ok(obj.id, 'toObject must include id');
    });

    it('hasPassword reflects authProviders, not password field projection', () => {
      const localUser = new User({
        name: 'Local',
        email: 'local-hp@example.com',
        authProviders: ['local'],
      });
      // Even without password selected, hasPassword should be true for local auth
      assert.equal(localUser.toSafeObject().hasPassword, true);

      const githubUser = new User({
        name: 'GitHub',
        email: 'github-hp@example.com',
        authProviders: ['github'],
        githubId: '77777',
      });
      assert.equal(githubUser.toSafeObject().hasPassword, false);

      const linkedUser = new User({
        name: 'Both',
        email: 'both-hp@example.com',
        authProviders: ['local', 'github'],
        githubId: '88888',
      });
      assert.equal(linkedUser.toSafeObject().hasPassword, true);
    });
  });
});
