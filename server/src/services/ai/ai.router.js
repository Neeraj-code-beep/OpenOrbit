import { env } from '../../config/env.js';
import { geminiProvider } from './providers/gemini.provider.js';
import { ollamaProvider } from './providers/ollama.provider.js';
import { AppError } from '../../utils/app-error.js';

export class AIRouter {
  constructor() {
    this.gemini = geminiProvider;
    this.ollama = ollamaProvider;
  }

  getActiveProviderName() {
    return env.AI_PROVIDER;
  }

  getActiveProvider() {
    if (env.AI_PROVIDER === 'ollama') {
      return this.ollama;
    }
    return this.gemini;
  }

  /**
   * Health status of all AI providers
   */
  async checkAllProviders() {
    const [geminiStatus, ollamaStatus] = await Promise.all([
      this.gemini.checkHealth(),
      this.ollama.checkHealth(),
    ]);

    return {
      activeProvider: env.AI_PROVIDER,
      providers: {
        gemini: geminiStatus,
        ollama: ollamaStatus,
      },
    };
  }

  /**
   * Routes prompt to the configured provider with graceful fallback if configured
   */
  async generateText(prompt) {
    const active = this.getActiveProvider();
    
    try {
      return await active.generateText(prompt);
    } catch (primaryErr) {
      // Check if fallback to Ollama or Gemini is possible
      if (env.AI_PROVIDER === 'gemini') {
        const ollamaHealth = await this.ollama.checkHealth();
        if (ollamaHealth.status === 'AVAILABLE') {
          console.warn('[AI_ROUTER] Gemini failed; falling back to local Ollama:', primaryErr.message);
          return await this.ollama.generateText(prompt);
        }
      } else if (env.AI_PROVIDER === 'ollama' && this.gemini.isConfigured()) {
        console.warn('[AI_ROUTER] Ollama failed; falling back to Gemini:', primaryErr.message);
        return await this.gemini.generateText(prompt);
      }
      // If no fallback is available, throw the primary error
      throw primaryErr;
    }
  }
}

export const aiRouter = new AIRouter();
