/**
 * Standard MCP Tool Definitions for GitHub Context & Investigation
 * Follows the official Model Context Protocol tool schema specification.
 */
export const GITHUB_MCP_TOOLS = [
  {
    name: 'github_search_issues',
    description: 'Search public GitHub issues using criteria like labels, keywords, and programming languages.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search keywords',
        },
        label: {
          type: 'string',
          description: 'Filter by issue label (e.g., "good-first-issue")',
        },
        language: {
          type: 'string',
          description: 'Filter by repository primary language (e.g., "javascript", "python")',
        },
        page: {
          type: 'number',
          description: 'Page number (default 1)',
        },
        per_page: {
          type: 'number',
          description: 'Results per page (max 100, default 15)',
        },
      },
      required: [],
    },
  },
  {
    name: 'github_get_issue_details',
    description: 'Fetch detailed information for a specific GitHub issue including body and labels.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'Repository owner (organization or username)',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        issueNumber: {
          type: 'number',
          description: 'Issue number',
        },
      },
      required: ['owner', 'repo', 'issueNumber'],
    },
  },
  {
    name: 'github_get_repo_readme',
    description: 'Retrieve the README markdown content of a GitHub repository for context.',
    inputSchema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'Repository owner',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
      },
      required: ['owner', 'repo'],
    },
  },
];
