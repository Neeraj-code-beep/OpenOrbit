import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MCPClientService } from '../services/mcp/mcp.client.js';
import { MCPRegistry } from '../services/mcp/mcp.registry.js';
import { AIService } from '../services/ai/ai.service.js';
import { createApp } from '../app.js';

describe('Model Context Protocol (MCP) Integration System', () => {
  let registry;
  let clientService;

  beforeEach(() => {
    registry = new MCPRegistry();
    clientService = new MCPClientService(registry);
  });

  describe('MCP Lifecycle & Configuration', () => {
    it('reports DISABLED, PENDING_SERVER_CONFIG, or NOT_INITIALIZED truthfully when unconfigured', () => {
      const status = clientService.getStatus();
      assert.ok(['DISABLED', 'PENDING_SERVER_CONFIG', 'NOT_INITIALIZED'].includes(status.status));
      assert.equal(status.connected, false);
      assert.equal(status.discoveredToolsCount, 0);
      assert.deepEqual(status.discoveredTools, []);
      assert.equal(clientService.isConnected(), false);
    });

    it('prevents duplicate initialization when already connecting or connected', async () => {
      clientService.status = 'CONNECTED';
      clientService.client = { callTool: async () => ({}) };
      const res = await clientService.connect();
      assert.equal(res, true);
    });

    it('gracefully handles disconnection and clears discovered tools', async () => {
      clientService.status = 'CONNECTED';
      let closed = false;
      clientService.client = {
        close: async () => {
          closed = true;
        },
      };
      clientService.discoveredTools.set('dummy_tool', { name: 'dummy_tool' });
      registry.registerRemoteTool({ name: 'dummy_tool' });

      await clientService.disconnect();
      assert.equal(closed, true);
      assert.equal(clientService.client, null);
      assert.equal(clientService.discoveredTools.size, 0);
      assert.equal(registry.listRemoteTools().length, 0);
    });
  });

  describe('Remote Tool Discovery & Execution', () => {
    it('discovers remote tools and populates registry accurately', async () => {
      // Mock MCP Client with tools/list capability
      const mockRemoteTools = [
        {
          name: 'github_get_repo_readme',
          description: 'Fetch README content',
          inputSchema: { type: 'object', required: ['owner', 'repo'] },
        },
        {
          name: 'github_search_issues',
          description: 'Search GitHub issues',
          inputSchema: { type: 'object', properties: {} },
        },
      ];

      clientService.client = {
        listTools: async () => ({ tools: mockRemoteTools }),
        getServerVersion: () => ({ name: 'mock-mcp-github', version: '1.2.0' }),
        callTool: async ({ name, arguments: args }) => {
          if (name === 'github_get_repo_readme') {
            return {
              content: [{ type: 'text', text: '# Express.js Framework\nFast, unopinionated web framework.' }],
            };
          }
          return { content: [] };
        },
      };
      clientService.status = 'CONNECTED';

      // Populate discovered tools
      for (const tool of mockRemoteTools) {
        clientService.discoveredTools.set(tool.name, tool);
        registry.registerRemoteTool(tool);
      }
      clientService.status = 'TOOLS_AVAILABLE';

      const status = clientService.getStatus();
      assert.equal(status.status, 'TOOLS_AVAILABLE');
      assert.equal(status.connected, true);
      assert.equal(status.discoveredToolsCount, 2);
      assert.equal(status.discoveredTools[0].name, 'github_get_repo_readme');

      // Test tool invocation
      const result = await clientService.invokeTool('github_get_repo_readme', {
        owner: 'expressjs',
        repo: 'express',
      });
      assert.equal(result.tool, 'github_get_repo_readme');
      assert.ok(result.result.content[0].text.includes('Express.js'));
    });

    it('rejects execution when no live MCP server is connected', async () => {
      clientService.status = 'PENDING_SERVER_CONFIG';
      clientService.client = null;

      await assert.rejects(
        async () => {
          await clientService.invokeTool('github_get_repo_readme', { owner: 'expressjs', repo: 'express' });
        },
        (err) => {
          assert.equal(err.code, 'MCP_SERVER_NOT_CONNECTED');
          assert.equal(err.statusCode, 503);
          return true;
        }
      );
    });

    it('validates required tool arguments before invoking remote server', async () => {
      clientService.status = 'CONNECTED';
      clientService.client = { callTool: async () => ({}) };

      await assert.rejects(
        async () => {
          // Missing repo argument
          await clientService.invokeTool('github_get_repo_readme', { owner: 'expressjs' });
        },
        (err) => {
          assert.equal(err.code, 'MCP_VALIDATION_ERROR');
          assert.equal(err.statusCode, 400);
          return true;
        }
      );
    });

    it('requires approval for consequential mutating tools', async () => {
      clientService.status = 'CONNECTED';
      clientService.client = { callTool: async () => ({}) };

      await assert.rejects(
        async () => {
          await clientService.invokeTool('github_create_issue_comment', {
            owner: 'expressjs',
            repo: 'express',
            issueNumber: 123,
            body: 'LGTM',
          });
        },
        (err) => {
          assert.equal(err.code, 'ACTION_APPROVAL_REQUIRED');
          assert.equal(err.statusCode, 403);
          return true;
        }
      );
    });
  });

  describe('Gemma Planning Context Integration & Provenance', () => {
    it('uses MCP tool context when connected and reports accurate metadata', async () => {
      const mockRouter = {
        getActiveProviderName: () => 'gemini',
        generateText: async (prompt) => {
          assert.ok(prompt.includes('Express.js Fast web framework'));
          return JSON.stringify({
            issueSummary: 'Fix routing bug',
            problemInterpretation: 'Route matching error in router',
            relevantFiles: [{ filePath: 'lib/router/index.js', reason: 'Router logic', isVerified: false }],
            implementationSteps: [{ stepNumber: 1, title: 'Fix regex', description: 'Update route regex' }],
            dependenciesAndRisks: [],
            acceptanceCriteria: ['Passes unit tests'],
            testPlan: ['test/router.js'],
            suggestedPR: { title: 'fix: router', description: 'Fixes bug' },
          });
        },
      };

      const mockGhService = {
        getRepositoryReadme: async () => '',
      };

      const mockMcp = {
        isConnected: () => true,
        hasTool: (name) => name === 'github_get_repo_readme',
        invokeTool: async (name) => {
          assert.equal(name, 'github_get_repo_readme');
          return {
            result: {
              content: [{ text: '# Express.js Fast web framework' }],
            },
          };
        },
      };

      const ai = new AIService(mockRouter, mockGhService, mockMcp);
      const res = await ai.generateContributionPlan({
        issueTitle: 'Router crash on null param',
        issueBody: 'See details in https://github.com/expressjs/express/issues/4000',
        repoOwner: 'expressjs',
        repoName: 'express',
      });

      assert.equal(res.success, true);
      assert.equal(res.meta.hasRepoContext, true);
      assert.equal(res.meta.mcpUsed, true);
      assert.deepEqual(res.meta.toolsInvoked, ['github_get_repo_readme']);
      assert.ok(res.meta.contextSources.includes('mcp:github_get_repo_readme'));
    });

    it('falls back to GitHub API service when MCP is offline, reporting truthful provenance', async () => {
      const mockRouter = {
        getActiveProviderName: () => 'gemini',
        generateText: async (prompt) => {
          assert.ok(prompt.includes('Direct GitHub API README'));
          return JSON.stringify({
            issueSummary: 'Fix issue via GitHub API context',
            problemInterpretation: 'Context from fallback API',
            relevantFiles: [],
            implementationSteps: [],
            dependenciesAndRisks: [],
            acceptanceCriteria: [],
            testPlan: [],
          });
        },
      };

      const mockGhService = {
        getRepositoryReadme: async (owner, repo) => {
          assert.equal(owner, 'facebook');
          assert.equal(repo, 'react');
          return '# React\nDirect GitHub API README';
        },
      };

      const mockMcp = {
        isConnected: () => false,
        hasTool: () => false,
      };

      const ai = new AIService(mockRouter, mockGhService, mockMcp);
      const res = await ai.generateContributionPlan({
        issueTitle: 'Hooks rendering bug',
        issueBody: 'State updates out of order',
        repoOwner: 'facebook',
        repoName: 'react',
      });

      assert.equal(res.success, true);
      assert.equal(res.meta.hasRepoContext, true);
      assert.equal(res.meta.mcpUsed, false);
      assert.deepEqual(res.meta.toolsInvoked, []);
      assert.ok(res.meta.contextSources.includes('github_api:repository_readme'));
    });

    it('truthfully reports hasRepoContext=false when no repository context is available', async () => {
      const mockRouter = {
        getActiveProviderName: () => 'gemini',
        generateText: async (prompt) => {
          assert.ok(prompt.includes('No README provided'));
          return JSON.stringify({
            issueSummary: 'Generic plan without repo context',
            problemInterpretation: 'General troubleshooting',
            relevantFiles: [],
            implementationSteps: [],
            dependenciesAndRisks: [],
            acceptanceCriteria: [],
            testPlan: [],
          });
        },
      };

      const mockGhService = {
        getRepositoryReadme: async () => '',
      };

      const mockMcp = {
        isConnected: () => false,
      };

      const ai = new AIService(mockRouter, mockGhService, mockMcp);
      const res = await ai.generateContributionPlan({
        issueTitle: 'Generic bug with no repo',
        issueBody: 'Simple code fix needed somewhere',
      });

      assert.equal(res.success, true);
      assert.equal(res.meta.hasRepoContext, false);
      assert.equal(res.meta.mcpUsed, false);
      assert.deepEqual(res.meta.toolsInvoked, []);
      assert.deepEqual(res.meta.contextSources, []);
    });
  });

  describe('Route Cleanliness & Endpoints', () => {
    const app = createApp();

    it('GET /api/mcp/status returns 200 with structured status', async () => {
      const server = app.listen(0);
      const port = server.address().port;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/mcp/status`);
        assert.equal(res.status, 200);
        const json = await res.json();
        assert.equal(json.success, true);
        assert.ok(json.data.status);
        assert.equal(typeof json.data.connected, 'boolean');
        assert.equal(typeof json.data.discoveredToolsCount, 'number');
      } finally {
        server.close();
      }
    });

    it('GET /api/v1/mcp/status returns 200 via versioned alias', async () => {
      const server = app.listen(0);
      const port = server.address().port;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/v1/mcp/status`);
        assert.equal(res.status, 200);
        const json = await res.json();
        assert.equal(json.success, true);
        assert.ok(json.data.status);
      } finally {
        server.close();
      }
    });

    it('GET /api/ai/contribution-plan returns 404 (only POST is allowed)', async () => {
      const server = app.listen(0);
      const port = server.address().port;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/ai/contribution-plan`);
        assert.equal(res.status, 404);
      } finally {
        server.close();
      }
    });
  });
});
