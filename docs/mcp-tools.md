# Model Context Protocol (MCP) Integration

OpenOrbit includes a complete client implementation of the official **Model Context Protocol (MCP)** specification using `@modelcontextprotocol/sdk` (`^1.32.1`).

## Architecture & Responsibilities

The MCP boundary in OpenOrbit is structured with clear separation of concerns:

- **Client Lifecycle (`mcp.client.js`):** Manages `Client` and `StdioClientTransport`, connection establishment, and clean shutdown.
- **Tool Registry (`mcp.registry.js`):** Validates tool invocation schemas against JSON Schema definitions.
- **Tool Definitions (`tools/github.tools.js`):** Standard tool definitions for GitHub operations.

```
+-------------------------------------------------------------+
|                      MCP Client Service                     |
|           (server/src/services/mcp/mcp.client.js)           |
+-------------------------------------------------------------+
          |                                      |
          v                                      v
+-----------------------+              +-----------------------+
|  MCP Tool Registry    |              | StdioClientTransport  |
| (Input Schema Checks) |              |  (Spawns subprocess)  |
+-----------------------+              +-----------------------+
                                                 |
                                                 v
                                       +-----------------------+
                                       | External MCP Server   |
                                       | (e.g. GitHub MCP Srv) |
                                       +-----------------------+
```

---

## Registered MCP Tools

OpenOrbit defines three official tools compliant with the MCP schema:

1. `github_search_issues`: Searches issues with query, label, language, and pagination options.
2. `github_get_issue_details`: Retrieves body, comments, and labels for a specific issue number.
3. `github_get_repo_readme`: Retrieves repository README contents for context.

---

## Current Status & Live Server Setup

### Status: `PENDING_SERVER_CONFIG`
To avoid ungrounded execution or spawning rogue background processes without developer intent, OpenOrbit reports `PENDING_SERVER_CONFIG` when no external MCP server command is configured in `.env`.

### Step-by-Step Instructions to Connect a Live Server

To connect a live GitHub MCP server:

1. Install the official GitHub MCP server package or run with `npx`:
   ```bash
   npx -y @modelcontextprotocol/server-github
   ```
2. Add your settings to `.env`:
   ```ini
   MCP_ENABLED=true
   MCP_SERVER_COMMAND=npx
   MCP_SERVER_ARGS=["-y", "@modelcontextprotocol/server-github"]
   GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token_here
   ```
3. Restart the OpenOrbit server:
   ```bash
   npm --prefix server run dev
   ```
4. Check the MCP status endpoint:
   ```bash
   curl http://localhost:5000/api/mcp/status
   ```
   The status will report `CONNECTED` and dynamically list discovered remote tools.
