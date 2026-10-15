import { env } from '../../../config/env.js';
import { AppError } from '../../../utils/app-error.js';

export class OllamaProvider {
  constructor() {
    this.name = 'ollama';
    this.host = env.OLLAMA_HOST || 'http://127.0.0.1:11434';
    this.modelName = env.OLLAMA_MODEL || 'llama3:latest';
    this.timeoutMs = 30000; // Local inference may take longer
  }

  /**
   * Health check for Ollama local service
   */
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${this.host}/api/tags`, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        return {
          provider: this.name,
          configured: true,
          status: 'UNREACHABLE',
          host: this.host,
          message: `Ollama returned HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const models = (data.models || []).map((m) => m.name);
      const hasModel = models.some((m) => m === this.modelName || m.startsWith(this.modelName));

      return {
        provider: this.name,
        configured: true,
        status: hasModel ? 'AVAILABLE' : 'MODEL_MISSING',
        host: this.host,
        targetModel: this.modelName,
        availableModels: models,
        message: hasModel ? 'Ollama running and target model present' : `Model '${this.modelName}' not found locally. Run: ollama pull ${this.modelName}`,
      };
    } catch (err) {
      return {
        provider: this.name,
        configured: true,
        status: 'OFFLINE',
        host: this.host,
        message: 'Could not connect to Ollama. Ensure Ollama is running (`ollama serve`).',
      };
    }
  }

  /**
   * Generates content from Ollama HTTP API
   * @param {string} prompt
   * @returns {Promise<string>}
   */
  async generateText(prompt) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelName,
          prompt,
          stream: false,
          format: 'json',
          options: {
            temperature: 0.2,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        if (response.status === 404 || body.includes('not found')) {
          throw new AppError(
            `Ollama model '${this.modelName}' not found. Download it with: ollama pull ${this.modelName}`,
            404,
            'OLLAMA_MODEL_NOT_FOUND'
          );
        }
        throw new AppError(`Ollama server returned HTTP ${response.status}: ${body}`, 502, 'OLLAMA_ERROR');
      }

      const data = await response.json();
      if (!data.response) {
        throw new AppError('Ollama returned empty response', 502, 'OLLAMA_EMPTY_RESPONSE');
      }
      return data.response;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new AppError(`Ollama inference timed out after ${this.timeoutMs / 1000}s`, 504, 'OLLAMA_TIMEOUT');
      }
      if (err.code === 'ECONNREFUSED' || (err.cause && err.cause.code === 'ECONNREFUSED')) {
        throw new AppError('Ollama is not running. Start it with `ollama serve` or switch to GEMINI.', 503, 'OLLAMA_OFFLINE');
      }
      if (err instanceof AppError) throw err;
      throw new AppError(`Failed to connect to local Ollama service: ${err.message}`, 502, 'OLLAMA_NETWORK_ERROR');
    } finally {
      clearTimeout(timer);
    }
  }
}

export const ollamaProvider = new OllamaProvider();
