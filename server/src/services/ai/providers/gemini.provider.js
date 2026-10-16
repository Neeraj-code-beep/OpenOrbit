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

  getModelName() {
    return env.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
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
        model: this.getModelName(),
        message: 'GEMINI_API_KEY is not set in environment',
      };
    }
    return {
      provider: this.name,
      configured: true,
      status: 'AVAILABLE',
      model: this.getModelName(),
    };
  }

  /**
   * Generates content using Google Gen AI SDK
   * @param {string} prompt
   * @param {object} options
   * @returns {Promise<string>} Raw JSON response text
   */
  async generateText(prompt, options = {}) {
    if (!this.isConfigured()) {
      throw new AppError(
        'Gemini API key is not configured. Set GEMINI_API_KEY in your .env file or choose AI_PROVIDER=ollama.',
        503,
        'AI_PROVIDER_UNCONFIGURED'
      );
    }

    const client = this.getClient();
    const model = this.getModelName();
    const isGemma = (model || '').toLowerCase().includes('gemma');
    const timeoutMs = options.timeoutMs || 25000;

    let timer;
    try {
      const config = {
        temperature: 0.2,
      };
      // Gemma models on Gemini API do not support responseMimeType: 'application/json'
      if (!isGemma) {
        config.responseMimeType = 'application/json';
      }

      const generatePromise = client.models.generateContent({
        model,
        contents: prompt,
        config,
      });

      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new AppError(`Cloud Gemma request timed out after ${timeoutMs / 1000}s`, 504, 'AI_TIMEOUT'));
        }, timeoutMs);
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      clearTimeout(timer);

      const text = response.text;
      if (!text) {
        throw new AppError('Gemini returned an empty response', 502, 'AI_EMPTY_RESPONSE');
      }
      return text;
    } catch (err) {
      if (timer) clearTimeout(timer);
      if (err instanceof AppError) throw err;
      const msg = err.message || '';
      if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid') || msg.includes('401')) {
        throw new AppError('The configured GEMINI_API_KEY is invalid or unauthorized.', 401, 'AI_AUTH_ERROR');
      }
      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429') || msg.includes('quota')) {
        throw new AppError('Gemini API quota exceeded or rate-limited.', 429, 'AI_QUOTA_EXCEEDED');
      }
      if (err.name === 'AbortError' || msg.includes('timed out')) {
        throw new AppError(`Cloud Gemma request timed out after ${timeoutMs / 1000}s`, 504, 'AI_TIMEOUT');
      }
      throw new AppError(`Gemini generation failed: ${msg}`, 502, 'AI_GENERATION_FAILED');
    }
  }
}


export const geminiProvider = new GeminiProvider();
