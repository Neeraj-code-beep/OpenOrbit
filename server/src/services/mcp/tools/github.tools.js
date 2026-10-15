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
    isConsequential: false,
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
  {
    name: 'github_create_issue_comment',
    description: 'Add a comment to a GitHub issue. Consequential: mutates repository state and requires explicit approval.',
    isConsequential: true,
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
        issueNumber: {
          type: 'number',
          description: 'Issue number',
        },
        body: {
          type: 'string',
          description: 'Comment body text',
        },
      },
      required: ['owner', 'repo', 'issueNumber', 'body'],
    },
  },
  {
    name: 'github_create_pull_request',
    description: 'Open a pull request on GitHub. Consequential: creates real PR and notifies maintainers; requires explicit approval.',
    isConsequential: true,
    inputSchema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'Target repository owner',
        },
        repo: {
          type: 'string',
          description: 'Target repository name',
        },
        title: {
          type: 'string',
          description: 'Pull request title',
        },
        head: {
          type: 'string',
          description: 'Branch containing the changes',
        },
        base: {
          type: 'string',
          description: 'Branch to merge into (e.g., main)',
        },
        body: {
          type: 'string',
          description: 'Pull request description',
        },
      },
      required: ['owner', 'repo', 'title', 'head', 'base'],
    },
  },
];
