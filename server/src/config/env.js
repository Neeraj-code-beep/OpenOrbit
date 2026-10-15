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

  // MCP Configuration (Optional)
  MCP_ENABLED: process.env.MCP_ENABLED === 'true',
  MCP_SERVER_COMMAND: process.env.MCP_SERVER_COMMAND || '',
  MCP_SERVER_ARGS: process.env.MCP_SERVER_ARGS ? JSON.parse(process.env.MCP_SERVER_ARGS) : [],
};

/**
 * Validates critical environment configuration and returns non-sensitive status
 */
export function getEnvStatus() {
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    corsOrigin: env.CORS_ORIGIN,
    hasGitHubToken: Boolean(env.GITHUB_TOKEN),
    aiProvider: env.AI_PROVIDER,
    hasGeminiKey: Boolean(env.GEMINI_API_KEY),
    geminiModel: env.GEMINI_MODEL,
    ollamaHost: env.OLLAMA_HOST,
    ollamaModel: env.OLLAMA_MODEL,
    mcpEnabled: env.MCP_ENABLED,
  };
}
