# Model Context Protocol (MCP) Integration & GitHub Tool Context

OpenOrbit includes a production-ready client implementation of the official **Model Context Protocol (MCP)** specification using `@modelcontextprotocol/sdk` (`^1.32.1`).

---

## 1. Architecture & Responsibilities

The MCP subsystem integrates real repository context into the Gemma contribution planning workflow while strictly preserving security boundaries:

```
+-----------------------------------------------------------------------+
|                      OpenOrbit Express Backend                        |
|                                                                       |
|  POST /api/ai/contribution-plan ──> AIService (Orchestrator)          |
|                                         │                             |
|          ┌──────────────────────────────┴───────────────────────┐     |
|          ▼                                                      ▼     |
|   MCP Client Service                                    GitHub API    |
|   (services/mcp/mcp.client.js)                          (Fallback)    |
|          │                                                            |
|          ▼ (Stdio Transport)                                          |
|   Official GitHub MCP Server                                          |
|   (@modelcontextprotocol/server-github)                               |
+───────────────────────────────────────────────────────────────────────+
           │
           ▼
  Gemma Planning Prompt (XML-escaped context + provenance metadata)
           │
           ▼
  Structured Contribution Plan Output (JSON)
```

### Components
- **Client Lifecycle (`server/src/services/mcp/mcp.client.js`):**
  - Manages `Client` and `StdioClientTransport`.
  - Automatically handles Windows child-process batch wrapping (`cmd.exe /c npx`).
  - Discovers remote tools via protocol `tools/list` requests.
  - Graceful connection termination on `SIGINT` / `SIGTERM`.
- **Tool Registry (`server/src/services/mcp/mcp.registry.js`):**
  - Distinguishes remotely discovered tools from local reference schemas.
  - Validates argument schemas against JSON schema specifications.
- **Security & Approval Gate (`server/src/utils/crypto.utils.js`):**
  - Read-only tools (`github_get_repo_readme`, `get_file_contents`) execute freely.
  - Consequential mutating tools require cryptographically signed HMAC approval tokens.
- **Context Orchestrator (`server/src/services/ai/ai.service.js`):**
  - Prioritizes read-only MCP tools when connected.
  - Gracefully falls back to direct GitHub REST API when MCP is offline or unconfigured.
  - Attaches truthful provenance metadata (`hasRepoContext`, `mcpUsed`, `toolsInvoked`, `contextSources`).

---

## 2. Selected GitHub MCP Server

- **Package**: `@modelcontextprotocol/server-github` (Official Anthropic Model Context Protocol project)
- **Source**: [https://github.com/modelcontextprotocol/servers/tree/main/src/github](https://github.com/modelcontextprotocol/servers/tree/main/src/github)
- **Transport**: `stdio` (standard input/output JSON-RPC 2.0)
- **Authentication**: `GITHUB_PERSONAL_ACCESS_TOKEN` with `repo` or `public_repo` read scope.

---

## 3. Configuration

Add the following to your `server/.env` file:

```ini
# Model Context Protocol (MCP) Configuration
MCP_ENABLED=true
MCP_SERVER_COMMAND=npx
MCP_SERVER_ARGS=["-y","@modelcontextprotocol/server-github"]

# GitHub Access Token (Read-only token recommended for safety)
GITHUB_TOKEN=ghp_your_token_here
```

### Windows Compatibility
On Windows platforms, spawning `npx` directly without a shell wrapper can trigger `EINVAL` due to Node.js subprocess security constraints on `.cmd` batch scripts. OpenOrbit's `MCPClientService` automatically wraps `npx` into `cmd.exe /c npx` on Windows, ensuring out-of-the-box cross-platform reliability without manual shell workarounds.

---

## 4. MCP Status States

The `/api/mcp/status` and `/api/health` endpoints report truthful, verified connection states:

| Status Code | Meaning |
| :--- | :--- |
| `DISABLED` | `MCP_ENABLED=false` in `.env`. Subsystem is dormant and consumes no resources. |
| `PENDING_SERVER_CONFIG` | `MCP_ENABLED=true`, but `MCP_SERVER_COMMAND` is empty. |
| `CONNECTING` | Subprocess is actively spawning and establishing JSON-RPC handshake. |
| `CONNECTED` | Protocol session established with remote MCP server. |
| `TOOLS_AVAILABLE` | Remote server connected and tools successfully discovered via `tools/list`. |
| `ERROR` | Subprocess failed to start, timed out (10s), or exited unexpectedly. |
| `DISCONNECTED` | Server was shut down cleanly. |

---

## 5. Gemma Context Orchestration & Provenance

When a developer requests a contribution plan (`POST /api/ai/contribution-plan`):

1. **Context Extraction**: The orchestrator inspects `repoOwner` and `repoName`, or parses them from GitHub issue URLs embedded in the issue body.
2. **MCP Tool Invocation**: If an MCP server is connected (`TOOLS_AVAILABLE`), the orchestrator queries read-only tools (e.g. `github_get_repo_readme`).
3. **API Fallback**: If MCP is not connected, the orchestrator seamlessly queries the direct GitHub REST API.
4. **Prompt Grounding**: The retrieved context is XML-escaped and injected into the Gemma prompt as grounded context.
5. **Truthful Metadata**: The response includes:
   ```json
   {
     "success": true,
     "data": { ... },
     "meta": {
       "provider": "gemini",
       "model": "gemma-4-26b-a4b-it",
       "durationMs": 1420,
       "hasRepoContext": true,
       "mcpUsed": true,
       "toolsInvoked": ["github_get_repo_readme"],
       "contextSources": ["mcp:github_get_repo_readme"]
     }
   }
   ```
   If no repository context was available, `hasRepoContext` is strictly `false` and `mcpUsed` is `false`.

---

## 6. Security Guarantees

1. **Untrusted Content Isolation**: All repository READMEs and issue descriptions are enclosed in `<untrusted_content>` tags to prevent prompt injection.
2. **Least Privilege**: The integration uses read-only tools for planning. Mutating tools require explicit user approval.
3. **No Secret Leakage**: Subprocess logs and status responses never leak personal access tokens or credentials.
4. **Timeout Guards**: All MCP connections (10s) and tool calls (15s) are bound by `AbortController` timers.
