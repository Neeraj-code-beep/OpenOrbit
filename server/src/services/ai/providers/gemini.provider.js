import { GoogleGenAI } from '@google/genai';
import { env } from '../../../config/env.js';
import { AppError } from '../../../utils/app-error.js';

export class GeminiProvider {
  constructor() {
    this.name = 'gemini';
    this.apiKey = env.GEMINI_API_KEY;
    this.modelName = env.GEMINI_MODEL || 'gemini-2.5-flash';
    this._client = null;

    if (this.apiKey) {
      try {
        this._client = new GoogleGenAI({ apiKey: this.apiKey });
      } catch (err) {
        console.warn('[GEMINI_INIT_WARN] Failed to instantiate GoogleGenAI client:', err.message);
      }
    }
  }

  getClient() {
    const currentKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!this._client && currentKey) {
      this.apiKey = currentKey;
      this.modelName = env.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      try {
        this._client = new GoogleGenAI({ apiKey: this.apiKey });
      } catch (err) {
        console.warn('[GEMINI_INIT_WARN] Failed to instantiate GoogleGenAI client:', err.message);
      }
    }
    return this._client;
  }

  isConfigured() {
    return Boolean((env.GEMINI_API_KEY || process.env.GEMINI_API_KEY) && this.getClient());
  }

  /**
   * Health check for Gemini provider
   */
  async checkHealth() {
    if (!this.isConfigured()) {
      return {
        provider: this.name,
        configured: false,
        status: 'UNCONFIGURED',
        message: 'GEMINI_API_KEY is not set in environment',
      };
    }
    return {
      provider: this.name,
      configured: true,
      status: 'AVAILABLE',
      model: this.modelName,
    };
  }

  /**
   * Generates content using Google Gen AI SDK
   * @param {string} prompt
   * @returns {Promise<string>} Raw JSON response text
   */
  async generateText(prompt) {
    if (!this.isConfigured()) {
      throw new AppError(
        'Gemini API key is not configured. Set GEMINI_API_KEY in your .env file or choose AI_PROVIDER=ollama.',
        503,
        'AI_PROVIDER_UNCONFIGURED'
      );
    }

    const client = this.getClient();
    const isGemma = (this.modelName || '').toLowerCase().includes('gemma');

    try {
      const config = {
        temperature: 0.2,
      };
      // Gemma models on Gemini API do not support responseMimeType: 'application/json'
      if (!isGemma) {
        config.responseMimeType = 'application/json';
      }

      const response = await client.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config,
      });

      const text = response.text;
      if (!text) {
        throw new AppError('Gemini returned an empty response', 502, 'AI_EMPTY_RESPONSE');
      }
      return text;
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (err.message && err.message.includes('API_KEY_INVALID')) {
        throw new AppError('The configured GEMINI_API_KEY is invalid.', 401, 'AI_AUTH_ERROR');
      }
      if (err.message && err.message.includes('RESOURCE_EXHAUSTED')) {
        throw new AppError('Gemini API quota exceeded or rate-limited.', 429, 'AI_QUOTA_EXCEEDED');
      }
      throw new AppError(`Gemini generation failed: ${err.message}`, 502, 'AI_GENERATION_FAILED');
    }
  }
}

export const geminiProvider = new GeminiProvider();
