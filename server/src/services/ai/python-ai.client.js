import { env } from '../../config/env.js';
import { AppError } from '../../utils/app-error.js';

export class PythonAIServiceClient {
  constructor() {
    this.timeoutMs = 10000;
  }

  getBaseUrl() {
    return (env.PYTHON_SERVICE_URL || process.env.PYTHON_AI_SERVICE_URL || process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
  }

  /**
   * Health status of external Python AI service
   */
  async checkHealth() {
    const baseUrl = this.getBaseUrl();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    try {
      const res = await fetch(`${baseUrl}/api/health`, {
        signal: controller.signal,
      });

      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        return {
          status: 'AVAILABLE',
          url: baseUrl,
          details: body.data || body,
        };
      }

      return {
        status: 'DEGRADED',
        url: baseUrl,
        httpStatus: res.status,
      };
    } catch {
      return {
        status: 'STANDBY',
        url: baseUrl,
        message: 'Python AI service is currently offline or in standby.',
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * POST /api/repository/tree
   */
  async parseRepositoryTree({ files = [], ignorePatterns = [], maxDepth = 10 } = {}) {
    return this._post('/api/repository/tree', {
      files,
      ignore_patterns: ignorePatterns,
      max_depth: maxDepth,
    });
  }

  /**
   * POST /api/repository/context
   */
  async extractRepositoryContext({
    metadata = {},
    filePaths = [],
    keyFilesContent = {},
    focusArea = '',
  } = {}) {
    return this._post('/api/repository/context', {
      metadata: {
        owner: metadata.owner || 'unknown',
        name: metadata.name || 'unknown',
        default_branch: metadata.defaultBranch || metadata.default_branch || 'main',
        open_issues: metadata.openIssues ?? metadata.open_issues ?? 0,
        stars: metadata.stars ?? 0,
        language: metadata.language || '',
      },
      file_paths: filePaths,
      key_files_content: keyFilesContent,
      focus_area: focusArea || null,
    });
  }

  /**
   * POST /api/repository/extract-context
   */
  async extractCodeContext({ query, files = [], maxTokens = 8000 } = {}) {
    return this._post('/api/repository/extract-context', {
      query,
      files,
      max_tokens: maxTokens,
    });
  }

  /**
   * POST /api/analysis/issue
   */
  async analyzeIssue({ issueTitle, issueBody = '', issueLabels = [], fileList = [] } = {}) {
    return this._post('/api/analysis/issue', {
      issue_title: issueTitle,
      issue_body: issueBody,
      issue_labels: issueLabels,
      file_list: fileList,
    });
  }

  /**
   * POST /api/analysis/code
   */
  async analyzeSourceCode({ filePath, codeContent, language = '' } = {}) {
    return this._post('/api/analysis/code', {
      file_path: filePath,
      code_content: codeContent,
      language,
    });
  }

  /**
   * Convenience backward-compatible method for repository/issue analysis
   */
  async analyzeContext({ issueTitle, issueBody, repoOwner, repoName, files = [] }) {
    return this.extractRepositoryContext({
      metadata: { owner: repoOwner, name: repoName },
      filePaths: files,
      focusArea: issueTitle,
    });
  }

  /**
   * Internal HTTP POST helper with bounded timeout and typed error mapping
   */
  async _post(endpoint, payload) {
    const baseUrl = this.getBaseUrl();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'OpenOrbit-Backend-Orchestrator/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMsg = data?.error?.message || data?.detail || `Python AI service responded with HTTP ${res.status}`;
        throw new AppError(errorMsg, res.status >= 500 ? 502 : 400, 'PYTHON_AI_ERROR', data);
      }

      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new AppError(`Python AI service timed out after ${this.timeoutMs / 1000}s`, 504, 'PYTHON_AI_TIMEOUT');
      }
      if (err instanceof AppError) throw err;
      throw new AppError(`Python AI service unreachable: ${err.message}`, 502, 'PYTHON_AI_UNAVAILABLE');
    } finally {
      clearTimeout(timer);
    }
  }
}

export const pythonAIClient = new PythonAIServiceClient();

