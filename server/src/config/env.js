import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory first, fallback to root if needed
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  // GitHub Integration (Optional token for higher rate limits)
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  GITHUB_API_BASE: process.env.GITHUB_API_BASE || 'https://api.github.com',

  // AI Provider: 'gemini' | 'ollama' | 'none'
  AI_PROVIDER: (process.env.AI_PROVIDER || 'gemini').toLowerCase(),
  
  // Gemini Configuration
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',

  // Ollama Local Model Configuration
  OLLAMA_HOST: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'llama3:latest',

  // Python AI Service Configuration
  PYTHON_SERVICE_URL: process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000',

  // Database Configuration
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/openorbit',

  // Authentication & JWT Configuration
  JWT_SECRET: (() => {
    const isProd = (process.env.NODE_ENV || 'development') === 'production';
    if (isProd && !process.env.JWT_SECRET) {
      throw new Error('FATAL: JWT_SECRET environment variable is required in production');
    }
    return process.env.JWT_SECRET || 'openorbit-dev-jwt-secret-key-do-not-use-in-production';
  })(),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  JWT_ALGORITHM: 'HS256',

  // Cookie Configuration
  COOKIE_NAME: 'openorbit_token',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || process.env.CORS_ORIGIN || 'http://localhost:5173',

  // GitHub App OAuth & Token Encryption Configuration
  ...(() => {
    const clientId = process.env.GITHUB_APP_CLIENT_ID || '';
    const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET || '';
    const callbackUrl = process.env.GITHUB_APP_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/github/callback';
    const keyRaw = process.env.GITHUB_ENCRYPTION_KEY ? process.env.GITHUB_ENCRYPTION_KEY.trim() : '';

    const isOAuthConfigured = Boolean(clientId || clientSecret);

    // If OAuth is configured, ensure full config and encryption key are valid
    if (isOAuthConfigured) {
      if (!clientId || !clientSecret) {
        throw new Error('FATAL: Both GITHUB_APP_CLIENT_ID and GITHUB_APP_CLIENT_SECRET must be configured when GitHub App authentication is enabled.');
      }
      if (!keyRaw) {
        throw new Error('FATAL: GITHUB_ENCRYPTION_KEY is required to enable GitHub App authentication (tokens must be encrypted at rest).');
      }
    }

    // Validate key format whenever an encryption key is provided
    if (keyRaw) {
      if (keyRaw.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(keyRaw)) {
        throw new Error('FATAL: GITHUB_ENCRYPTION_KEY must be a valid 64-character hexadecimal string (32 bytes / 256 bits).');
      }
    }

    return {
      GITHUB_APP_CLIENT_ID: clientId,
      GITHUB_APP_CLIENT_SECRET: clientSecret,
      GITHUB_APP_CALLBACK_URL: callbackUrl,
      GITHUB_ENCRYPTION_KEY: keyRaw,
      GITHUB_AUTH_ENABLED: isOAuthConfigured && Boolean(keyRaw),
    };
  })(),

  // MCP Configuration (Optional)
  MCP_ENABLED: process.env.MCP_ENABLED === 'true',
  MCP_SERVER_COMMAND: process.env.MCP_SERVER_COMMAND || '',
  MCP_SERVER_ARGS: process.env.MCP_SERVER_ARGS ? JSON.parse(process.env.MCP_SERVER_ARGS) : [],
};

/**
 * Reusable options for setting the authentication HTTP-only cookie
 */
export function getAuthCookieOptions() {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  };
}

/**
 * Reusable options for clearing the authentication HTTP-only cookie
 */
export function getClearCookieOptions() {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  };
}

/**
 * Validates critical environment configuration and returns non-sensitive status
 */
export function getEnvStatus() {
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    corsOrigin: env.CORS_ORIGIN,
    clientOrigin: env.CLIENT_ORIGIN,
    hasMongoUri: Boolean(env.MONGODB_URI),
    hasJwtSecret: Boolean(env.JWT_SECRET),
    hasGitHubToken: Boolean(env.GITHUB_TOKEN),
    aiProvider: env.AI_PROVIDER,
    hasGeminiKey: Boolean(env.GEMINI_API_KEY),
    geminiModel: env.GEMINI_MODEL,
    ollamaHost: env.OLLAMA_HOST,
    ollamaModel: env.OLLAMA_MODEL,
    mcpEnabled: env.MCP_ENABLED,
    hasGitHubApp: Boolean(env.GITHUB_AUTH_ENABLED),
    hasEncryptionKey: Boolean(env.GITHUB_ENCRYPTION_KEY),
  };
}
