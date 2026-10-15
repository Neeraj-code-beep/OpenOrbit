# PRPath Architecture

## High-Level System Architecture

PRPath is architected around the **"Human-in-the-Loop Contribution"** pattern. Rather than allowing an autonomous agent to execute arbitrary shell commands or commit unreviewed code, PRPath provides deterministic repository context, bounded AI planning, and human approval gates.

```
+-------------------------------------------------------------+
|                      React 19 Frontend                      |
| (Dashboard, Issue Discovery, Repo Inspector, Plan Viewer)   |
+-------------------------------------------------------------+
                              |
                     HTTP /api/ (Vite Proxy)
                              v
+-------------------------------------------------------------+
|                     Express 5 Backend                       |
|   - Request ID & CORS Security Middleware                   |
|   - Input Validation Layer (Zod/Custom)                     |
|   - Centralized Operational Error Handler                   |
+-------------------------------------------------------------+
      |                       |                      |
      v                       v                      v
+-----------------+   +------------------+   +----------------+
| GitHub Service  |   |    AI Router     |   |   MCP Client   |
| (REST / RateLim)|   | (Gemini / Ollama)|   | (@mcp/sdk 1.32)|
+-----------------+   +------------------+   +----------------+
      |                       |                      |
      v                       v                      v
GitHub API v3         Cloud / Local LLMs     External MCP Srv
```

## Module Boundaries

1. **Frontend (`client/`)**
   - Pure presentation and user interaction.
   - Communicates with `/api` via `apiClient.js`.
   - Never receives or manages API secrets, tokens, or raw prompts.
   - Visual tokens defined in `variables.css` and `index.css`.

2. **Backend Server (`server/`)**
   - Bootstrapped via `createApp()` in `app.js` and `server.js`.
   - Encapsulates external credentials (`GITHUB_TOKEN`, `GEMINI_API_KEY`).
   - Limits incoming request bodies to 1MB.
   - Enforces explicit CORS origins (`http://localhost:5173`).

3. **GitHub Integration Layer (`server/src/services/github/`)**
   - `github.client.js`: HTTP client handling authorization headers, timeouts, and rate limits.
   - `github.mapper.js`: Normalizes raw GitHub payloads into predictable internal models.
   - `github.service.js`: High-level queries (issue search, repo context, README extraction).

4. **AI Planning Layer (`server/src/services/ai/`)**
   - `ai.router.js`: Selects active provider and handles graceful failover.
   - `gemini.provider.js`: Google Gen AI SDK integration for hosted Gemini/Gemma models.
   - `ollama.provider.js`: Direct HTTP connection to Ollama local instance (`127.0.0.1:11434`).
   - `prompts/contribution-plan.prompt.js`: Encloses untrusted context in `<untrusted_content>` tags.

5. **Model Context Protocol Client (`server/src/services/mcp/`)**
   - Official `@modelcontextprotocol/sdk` client wrapper.
   - Registers standard tools with input schemas.
   - Tracks connection lifecycle (`PENDING_SERVER_CONFIG`, `CONNECTED`, etc.).
