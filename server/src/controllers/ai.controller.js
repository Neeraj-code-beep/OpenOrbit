import { aiService } from '../services/ai/ai.service.js';
import { aiRouter } from '../services/ai/ai.router.js';
import { pythonAIClient } from '../services/ai/python-ai.client.js';
import { AppError } from '../utils/app-error.js';

/**
 * Generates an AI-assisted contribution plan
 */
export async function generateContributionPlan(req, res) {
  const { issueTitle, issueBody, repoOwner, repoName, verifiedFiles } = req.body;

  const result = await aiService.generateContributionPlan({
    issueTitle,
    issueBody,
    repoOwner,
    repoName,
    verifiedFiles,
  });

  res.status(200).json(result);
}

/**
 * Checks AI provider availability
 */
export async function getAIStatus(req, res) {
  const status = await aiRouter.checkAllProviders();
  res.status(200).json({
    success: true,
    data: status,
  });
}

/**
 * POST /api/ai/analyze-issue
 * Analyzes an open-source issue using the Python AI Service
 */
export async function analyzeIssue(req, res) {
  const { issueTitle, issueBody, issueLabels, fileList } = req.body || {};
  if (!issueTitle || !String(issueTitle).trim()) {
    throw new AppError('issueTitle is required', 400, 'VALIDATION_ERROR');
  }

  const result = await pythonAIClient.analyzeIssue({
    issueTitle: String(issueTitle).trim(),
    issueBody: issueBody ? String(issueBody).trim() : '',
    issueLabels: Array.isArray(issueLabels) ? issueLabels : [],
    fileList: Array.isArray(fileList) ? fileList : [],
  });

  res.status(200).json(result);
}

/**
 * POST /api/ai/analyze-code
 * Analyzes source code using the Python AI Service
 */
export async function analyzeCode(req, res) {
  const { filePath, codeContent, language } = req.body || {};
  if (!filePath || !String(filePath).trim()) {
    throw new AppError('filePath is required', 400, 'VALIDATION_ERROR');
  }
  if (!codeContent || typeof codeContent !== 'string') {
    throw new AppError('codeContent is required and must be a string', 400, 'VALIDATION_ERROR');
  }

  const result = await pythonAIClient.analyzeSourceCode({
    filePath: String(filePath).trim(),
    codeContent,
    language: language || '',
  });

  res.status(200).json(result);
}

/**
 * POST /api/ai/repository-context
 * Extracts architecture and repository summary using the Python AI Service
 */
export async function getRepositoryContext(req, res) {
  const { metadata, filePaths, keyFilesContent, focusArea } = req.body || {};
  if (!metadata || !metadata.owner || !metadata.name) {
    throw new AppError('metadata with owner and name is required', 400, 'VALIDATION_ERROR');
  }

  const result = await pythonAIClient.extractRepositoryContext({
    metadata,
    filePaths: Array.isArray(filePaths) ? filePaths : [],
    keyFilesContent: keyFilesContent || {},
    focusArea: focusArea || '',
  });

  res.status(200).json(result);
}

