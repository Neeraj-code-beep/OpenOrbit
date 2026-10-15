import { aiRouter } from './ai.router.js';
import { buildContributionPlanPrompt } from './prompts/contribution-plan.prompt.js';
import { parseAndValidatePlan } from '../contribution/plan.validator.js';
import { githubService } from '../github/github.service.js';
import { mcpClient } from '../mcp/mcp.client.js';
import { env } from '../../config/env.js';

export class AIService {
  constructor(router = aiRouter, ghService = githubService, mcp = mcpClient) {
    this.router = router;
    this.ghService = ghService;
    this.mcp = mcp;
  }

  /**
   * Generates a structured contribution plan grounded in repository context
   */
  async generateContributionPlan({ issueTitle, issueBody, repoOwner, repoName, verifiedFiles = [] }) {
    const startTime = Date.now();
    let repoReadme = '';
    const retrievedFiles = [...(Array.isArray(verifiedFiles) ? verifiedFiles : [])];

    // Context provenance tracking
    const provenance = {
      mcpUsed: false,
      toolsInvoked: [],
      contextSources: [],
      warnings: [],
    };

    // Extract or infer owner and repo if missing
    let owner = repoOwner || '';
    let repo = repoName || '';
    if ((!owner || !repo) && typeof issueBody === 'string') {
      const urlMatch = issueBody.match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
      if (urlMatch) {
        owner = owner || urlMatch[1];
        repo = repo || urlMatch[2].replace(/\.git$/, '');
      }
    }

    const fullRepoName = owner && repo ? `${owner}/${repo}` : repo || '';

    // Step 1: If an MCP server is connected, attempt read-only context retrieval via MCP tools
    if (owner && repo && this.mcp && this.mcp.isConnected()) {
      // 1A: Official GitHub MCP server tool: get_file_contents
      if (this.mcp.hasTool('get_file_contents')) {
        for (const readmeFilename of ['README.md', 'Readme.md', 'readme.md']) {
          if (repoReadme) break;
          try {
            const mcpRes = await this.mcp.invokeTool('get_file_contents', {
              owner,
              repo,
              path: readmeFilename,
            });
            const rawText = mcpRes?.result?.content?.[0]?.text;
            if (rawText) {
              try {
                const parsed = JSON.parse(rawText);
                if (parsed.content && parsed.encoding === 'base64') {
                  repoReadme = Buffer.from(parsed.content.replace(/\s/g, ''), 'base64').toString('utf8');
                } else if (parsed.content) {
                  repoReadme = parsed.content;
                } else {
                  repoReadme = rawText;
                }
              } catch (_) {
                repoReadme = rawText;
              }
              if (repoReadme) {
                provenance.mcpUsed = true;
                provenance.toolsInvoked.push('get_file_contents');
                provenance.contextSources.push('mcp:get_file_contents');
              }
            }
          } catch (mcpErr) {
            provenance.warnings.push(`MCP tool 'get_file_contents' (${readmeFilename}): ${mcpErr.message}`);
          }
        }
      }

      // 1B: Reference/mock tool: github_get_repo_readme
      if (!repoReadme && this.mcp.hasTool('github_get_repo_readme')) {
        try {
          const mcpRes = await this.mcp.invokeTool('github_get_repo_readme', { owner, repo });
          const content = mcpRes?.result?.content?.[0]?.text;
          if (content) {
            repoReadme = content;
            provenance.mcpUsed = true;
            provenance.toolsInvoked.push('github_get_repo_readme');
            provenance.contextSources.push('mcp:github_get_repo_readme');
          }
        } catch (mcpErr) {
          provenance.warnings.push(`MCP tool 'github_get_repo_readme' error: ${mcpErr.message}`);
        }
      }
    }

    // Step 2: Fallback to direct GitHub API service if README not yet retrieved
    if (!repoReadme && owner && repo) {
      try {
        repoReadme = await this.ghService.getRepositoryReadme(owner, repo);
        if (repoReadme) {
          provenance.contextSources.push('github_api:repository_readme');
        }
      } catch (err) {
        provenance.warnings.push(`GitHub API README retrieval note: ${err.message}`);
      }
    }

    // Step 3: Safely limit only the text sent to the AI provider to 30,000 characters to prevent prompt overflow
    const boundedIssueBody =
      typeof issueBody === 'string' && issueBody.length > 30000
        ? issueBody.slice(0, 30000) + '\n\n[Body truncated to 30,000 characters for AI prompt context]'
        : issueBody;

    // Step 4: Build injection-safe prompt
    const prompt = buildContributionPlanPrompt({
      issueTitle,
      issueBody: boundedIssueBody,
      repoName: fullRepoName,
      repoReadme,
      verifiedFiles: retrievedFiles,
    });

    // Step 5: Execute through active router (Gemma/Gemini/Ollama)
    const rawOutput = await this.router.generateText(prompt);

    // Step 6: Parse and validate strictly
    const plan = parseAndValidatePlan(rawOutput, {
      repoName: fullRepoName,
      issueTitle,
    });

    // Step 7: Reconcile verified files in plan
    if (retrievedFiles.length > 0 && Array.isArray(plan.relevantFiles)) {
      for (const rf of plan.relevantFiles) {
        if (retrievedFiles.includes(rf.filePath)) {
          rf.isVerified = true;
        }
      }
    }

    const durationMs = Date.now() - startTime;
    const hasRepoContext = Boolean(repoReadme || retrievedFiles.length > 0);

    return {
      success: true,
      data: plan,
      meta: {
        provider: this.router.getActiveProviderName(),
        model: env.GEMINI_MODEL,
        durationMs,
        hasRepoContext,
        mcpUsed: provenance.mcpUsed,
        toolsInvoked: provenance.toolsInvoked,
        contextSources: provenance.contextSources,
        ...(provenance.warnings.length > 0 ? { contextWarnings: provenance.warnings } : {}),
      },
    };
  }
}

export const aiService = new AIService();
