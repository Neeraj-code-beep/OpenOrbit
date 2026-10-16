import { env } from '../../config/env.js';
import { geminiProvider } from './providers/gemini.provider.js';
import { ollamaProvider } from './providers/ollama.provider.js';
import { AppError } from '../../utils/app-error.js';

export class AIRouter {
  constructor(gemini = geminiProvider, ollama = ollamaProvider) {
    this.gemini = gemini;
    this.ollama = ollama;
  }

  getActiveProviderName() {
    return env.AI_PROVIDER;
  }

  /**
   * Health status of all AI providers with honest connectivity & model checks
   */
  async checkAllProviders() {
    const [geminiStatus, ollamaStatus] = await Promise.all([
      this.gemini.checkHealth(),
      this.ollama.checkHealth(),
    ]);

    const activeProvider = env.AI_PROVIDER;
    const isCloudPrimary = activeProvider === 'gemini';
    const isCloudAvailable = geminiStatus.status === 'AVAILABLE';
    const isLocalAvailable = ollamaStatus.status === 'AVAILABLE';

    let routingStrategy = 'cloud-first (primary: Cloud Gemma, fallback: Local Gemma 2B via Ollama)';
    if (activeProvider === 'none') {
      routingStrategy = 'disabled (AI_PROVIDER=none)';
    } else if (activeProvider === 'ollama') {
      routingStrategy = 'local-only (forced via AI_PROVIDER=ollama)';
    }

    return {
      activeProvider,
      routingStrategy,
      cloudPrimary: isCloudPrimary,
      operationalStatus: (isCloudPrimary && isCloudAvailable)
        ? 'PRIMARY_ONLINE'
        : (isLocalAvailable ? 'FALLBACK_ONLINE' : 'ALL_OFFLINE'),
      providers: {
        gemini: geminiStatus,
        ollama: ollamaStatus,
      },
    };
  }

  /**
   * Routes prompt with strict cloud-first priority, falling back to local Gemma 2B on eligible failure
   */
  async generateTextWithProvenance(prompt, options = {}) {
    if (env.AI_PROVIDER === 'none') {
      throw new AppError(
        'AI planning is explicitly disabled on this server (AI_PROVIDER=none). Set AI_PROVIDER=gemini or configure local Ollama.',
        503,
        'AI_DISABLED'
      );
    }

    // If explicitly forced to ollama-only mode via configuration
    if (env.AI_PROVIDER === 'ollama') {
      const text = await this.ollama.generateText(prompt, options);
      return {
        text,
        provider: 'ollama',
        model: this.ollama.getModelName ? this.ollama.getModelName() : this.ollama.modelName,
        fallbackUsed: false,
      };
    }

    // Default & Master policy: CLOUD FIRST (Primary Cloud Gemma -> Local Gemma 2B fallback)
    let primaryError = null;

    if (this.gemini.isConfigured()) {
      try {
        const text = await this.gemini.generateText(prompt, options);
        return {
          text,
          provider: 'gemini',
          model: this.gemini.getModelName ? this.gemini.getModelName() : this.gemini.modelName,
          fallbackUsed: false,
        };
      } catch (err) {
        primaryError = err;
        console.warn(`[AI_ROUTER] Primary Cloud Gemma failed (${err.code || 'ERROR'}: ${err.message}). Attempting fallback to local Gemma 2B (Ollama)...`);
      }
    } else {
      primaryError = new AppError('Gemini API key is not configured in environment', 503, 'AI_PROVIDER_UNCONFIGURED');
      console.warn(`[AI_ROUTER] Cloud Gemma is not configured. Attempting fallback to local Gemma 2B (Ollama)...`);
    }

    // Attempt local Gemma 2B fallback through Ollama
    try {
      const text = await this.ollama.generateText(prompt, options);
      return {
        text,
        provider: 'ollama',
        model: this.ollama.getModelName ? this.ollama.getModelName() : this.ollama.modelName,
        fallbackUsed: true,
        fallbackReason: primaryError.message,
        primaryErrorCode: primaryError.code,
      };
    } catch (fallbackErr) {
      console.error(`[AI_ROUTER] Local Gemma 2B fallback also failed (${fallbackErr.code || 'ERROR'}: ${fallbackErr.message})`);
      
      const cloudModel = this.gemini.getModelName ? this.gemini.getModelName() : this.gemini.modelName;
      const localModel = this.ollama.getModelName ? this.ollama.getModelName() : this.ollama.modelName;

      throw new AppError(
        `All AI providers failed. Primary Cloud Gemma (${cloudModel}): ${primaryError.message}. Fallback Local Gemma (${localModel}): ${fallbackErr.message}.`,
        502,
        'AI_ALL_PROVIDERS_FAILED',
        {
          cloudError: primaryError.message,
          cloudErrorCode: primaryError.code,
          localError: fallbackErr.message,
          localErrorCode: fallbackErr.code,
        }
      );
    }
  }

  /**
   * Convenience backwards-compatible method returning only the generated text
   */
  async generateText(prompt, options = {}) {
    const result = await this.generateTextWithProvenance(prompt, options);
    return result.text;
  }
}

export const aiRouter = new AIRouter();

