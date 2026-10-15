import crypto from 'crypto';
import { AppError } from './app-error.js';

/**
 * Validates that an encryption key is a 64-character hex string representing exactly 32 bytes (256 bits)
 * @param {string} keyHex
 * @returns {Buffer}
 */
export function validateEncryptionKey(keyHex) {
  if (!keyHex || typeof keyHex !== 'string') {
    throw new AppError('Encryption key is required and must be a string', 500, 'CRYPTO_KEY_INVALID');
  }
  const cleanHex = keyHex.trim();
  if (cleanHex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(cleanHex)) {
    throw new AppError(
      'Invalid encryption key: must be a 64-character hexadecimal string (32 bytes / 256 bits)',
      500,
      'CRYPTO_KEY_INVALID'
    );
  }
  return Buffer.from(cleanHex, 'hex');
}

/**
 * Encrypts sensitive string payload (e.g. GitHub access token) using AES-256-GCM
 * Formats output as `enc:{version}:{iv_hex}:{authTag_hex}:{ciphertext_hex}`
 *
 * @param {string} plaintext - Sensitive string to encrypt
 * @param {string|Buffer} key - 32-byte encryption key
 * @param {string} [version='v1'] - Key version identifier for rotation support
 * @returns {string} Serialized encrypted payload
 */
export function encryptToken(plaintext, key, version = 'v1') {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new AppError('Plaintext is required for encryption', 500, 'CRYPTO_ERROR');
  }

  const keyBuffer = Buffer.isBuffer(key) ? key : validateEncryptionKey(key);
  // 12 bytes IV is the standard recommended length for AES-GCM
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `enc:${version}:${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
}

/**
 * Decrypts AES-256-GCM payload with authenticated tag verification
 *
 * @param {string} encryptedPayload - Serialized string in format `enc:{version}:{iv}:{authTag}:{ciphertext}`
 * @param {string|Buffer} key - 32-byte encryption key matching the version
 * @returns {string} Decrypted utf8 plaintext
 */
export function decryptToken(encryptedPayload, key) {
  if (!encryptedPayload || typeof encryptedPayload !== 'string') {
    throw new AppError('Encrypted payload string is required for decryption', 500, 'CRYPTO_ERROR');
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 5 || parts[0] !== 'enc') {
    throw new AppError('Malformed encrypted payload structure', 500, 'CRYPTO_PAYLOAD_INVALID');
  }

  const [, version, ivHex, authTagHex, ciphertextHex] = parts;
  const keyBuffer = Buffer.isBuffer(key) ? key : validateEncryptionKey(key);

  try {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    if (iv.length !== 12 || authTag.length !== 16) {
      throw new Error('Invalid IV or auth tag length');
    }

    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    throw new AppError(
      `Cryptographic verification failed: authentication tag mismatch or corrupted data (${err.message})`,
      500,
      'CRYPTO_DECRYPT_FAILED'
    );
  }
}

/**
 * Generates RFC 7636 PKCE code_verifier and code_challenge (S256)
 * @returns {{ codeVerifier: string, codeChallenge: string, method: 'S256' }}
 */
export function generatePkceChallenge() {
  // 32 bytes random base64url string produces 43 characters (RFC 7636 min length is 43)
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return {
    codeVerifier,
    codeChallenge,
    method: 'S256',
  };
}

/**
 * Generates high-entropy state token for OAuth CSRF defense
 * @returns {string} 64-character hexadecimal string
 */
export function generateOauthState() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generates single-use reauthentication ticket
 * The plaintext token is returned to be held temporarily by the client or state cookie,
 * while the SHA-256 hash is stored in MongoDB to prevent bearer token leakage if DB is read.
 *
 * @param {number} [ttlMs=300000] - 5 minutes default TTL
 * @returns {{ ticket: string, hash: string, expiresAt: Date }}
 */
export function createReauthTicket(ttlMs = 300000) {
  const ticket = crypto.randomBytes(32).toString('hex');
  const hash = hashReauthTicket(ticket);
  const expiresAt = new Date(Date.now() + ttlMs);

  return {
    ticket,
    hash,
    expiresAt,
  };
}

/**
 * Computes deterministic SHA-256 hash of a reauth ticket
 * @param {string} ticket
 * @returns {string}
 */
export function hashReauthTicket(ticket) {
  if (!ticket || typeof ticket !== 'string') {
    throw new AppError('Ticket is required for hashing', 400, 'INVALID_TICKET');
  }
  return crypto.createHash('sha256').update(ticket).digest('hex');
}

/**
 * Creates a cryptographically bound, tamper-evident approval token for consequential actions
 * Binds userId, tool name, arguments hash, and expiry time using HMAC-SHA256
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.tool
 * @param {object} params.args
 * @param {string} secretKey
 * @param {number} [ttlMs=300000] - 5 minutes default
 * @returns {string} Safe URL-encoded token
 */
export function createActionApprovalToken({ userId, tool, args = {} }, secretKey, ttlMs = 300000) {
  if (!userId || !tool) {
    throw new AppError('userId and tool are required to create an action approval token', 400, 'INVALID_APPROVAL_PARAMS');
  }
  if (!secretKey) {
    throw new AppError('Secret key is required for signing approval tokens', 500, 'CRYPTO_KEY_MISSING');
  }

  // Canonicalize arguments for deterministic hash
  const canonicalArgs = JSON.stringify(args, Object.keys(args).sort());
  const argsHash = crypto.createHash('sha256').update(canonicalArgs).digest('hex');
  const expiresAt = Date.now() + ttlMs;

  const payload = JSON.stringify({ userId: String(userId), tool, argsHash, expiresAt });
  const b64Payload = Buffer.from(payload, 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', secretKey).update(b64Payload).digest('base64url');

  return `${b64Payload}.${signature}`;
}

/**
 * Verifies that an action approval token matches the target action, user, arguments, and is not expired
 *
 * @param {string} token
 * @param {object} expected
 * @param {string} expected.userId
 * @param {string} expected.tool
 * @param {object} expected.args
 * @param {string} secretKey
 * @returns {{ valid: boolean, error?: string }}
 */
export function verifyActionApprovalToken(token, { userId, tool, args = {} }, secretKey) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Approval token is required for consequential action' };
  }
  if (!secretKey) {
    return { valid: false, error: 'Secret key missing for approval verification' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed approval token structure' };
  }

  const [b64Payload, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', secretKey).update(b64Payload).digest('base64url');

  // Constant-time signature comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature, 'utf8');
  const expectedSigBuffer = Buffer.from(expectedSig, 'utf8');
  if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
    return { valid: false, error: 'Invalid or forged approval token signature' };
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
  } catch {
    return { valid: false, error: 'Corrupted approval token payload' };
  }

  if (payload.expiresAt < Date.now()) {
    return { valid: false, error: 'Approval token has expired' };
  }

  if (payload.userId !== String(userId)) {
    return { valid: false, error: 'Approval token user mismatch' };
  }

  if (payload.tool !== tool) {
    return { valid: false, error: 'Approval token tool mismatch' };
  }

  const canonicalArgs = JSON.stringify(args, Object.keys(args).sort());
  const expectedArgsHash = crypto.createHash('sha256').update(canonicalArgs).digest('hex');

  if (payload.argsHash !== expectedArgsHash) {
    return { valid: false, error: 'Approval token arguments mismatch (arguments were altered after approval)' };
  }

  return { valid: true };
}

