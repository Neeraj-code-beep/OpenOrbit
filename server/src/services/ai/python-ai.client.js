import { env } from '../../config/env.js';
import { AppError } from '../../utils/app-error.js';

export class PythonAIServiceClient {
  constructor() {
    this.baseUrl = env.PYTHON_SERVICE_URL || process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';
    this.timeoutMs = 10000;
  }

  /**
   * Health status of external Python AI service
   */
  async checkHealth() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
          status: 'AVAILABLE',
          url: this.baseUrl,
          details: data,
        };
      }

      return {
        status: 'DEGRADED',
        url: this.baseUrl,
        httpStatus: res.status,
      };
    } catch {
      return {
        status: 'STANDBY',
        url: this.baseUrl,
        message: 'Python AI service is currently offline or standby (owned by teammates).',
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Delegates repository/issue analysis to Python FastAPI service
   * Falls back to built-in AI service if Python service is unavailable
   */
  async analyzeContext({ issueTitle, issueBody, repoOwner, repoName, files = [] }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'OpenOrbit-Backend-Orchestrator/1.0',
        },
        body: JSON.stringify({
          issue_title: issueTitle,
          issue_body: issueBody,
          repo_owner: repoOwner,
          repo_name: repoName,
          files,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new AppError(`Python AI service responded with HTTP ${res.status}`, res.status >= 500 ? 502 : 400, 'PYTHON_AI_ERROR');
      }

      return await res.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new AppError('Python AI service timed out after 10s', 504, 'PYTHON_AI_TIMEOUT');
      }
      if (err instanceof AppError) throw err;
      throw new AppError(`Python AI service unreachable: ${err.message}`, 502, 'PYTHON_AI_UNAVAILABLE');
    } finally {
      clearTimeout(timer);
    }
  }
}

export const pythonAIClient = new PythonAIServiceClient();
