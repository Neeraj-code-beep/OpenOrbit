# PRPath MVP Plan & Milestones

## Phase 1: MVP Core (Completed)
- [x] Full stack scaffold with React 19 + Vite 8 frontend and Express 5 backend.
- [x] Centralized error handling, request ID middleware, CORS restriction, and body size limits.
- [x] Truthful `GET /api/health` endpoint reporting telemetry for GitHub, Gemini, Ollama, and MCP.
- [x] Real GitHub REST API integration:
  - Issue search (`/api/github/issues`) with filters for labels, language, keywords.
  - Repository lookup (`/api/github/repositories/:owner/:repo`) with verified stars, forks, and README snippet.
  - Issue detail view (`/api/github/repositories/:owner/:repo/issues/:issueNumber`).
- [x] AI Contribution Planning Engine:
  - Multi-provider support: Google Gemini (`@google/genai`) and Ollama (local HTTP).
  - XML prompt injection defense wrappers.
  - Strict JSON schema plan validation.
  - PR title and markdown description generator.
- [x] Official Model Context Protocol (`@modelcontextprotocol/sdk`) client layer:
  - Lifecycle management and stdio transport.
  - Pre-registered GitHub MCP tool definitions.
  - Truthful status tracking (`PENDING_SERVER_CONFIG`).
- [x] Modern glassmorphic frontend UI:
  - Interactive dashboard with live telemetry.
  - Filterable Issue Explorer.
  - Repository Inspector.
  - Contribution Plan Workspace with step-by-step roadmap and PR markdown generator.
  - Settings page with provider diagnostics.
- [x] Test suite: 10/10 passing tests with zero dependencies using native Node.js test runner.
- [x] Linting & build: 0 warnings, 0 errors with Oxlint; 299ms production Vite compilation.

---

## Phase 2: Next Iteration (Upcoming)
- [ ] Direct GitHub OAuth authentication to let users star repos or draft PRs directly with user approval.
- [ ] Diff viewer component in the frontend to review proposed code changes side-by-side.
- [ ] Interactive live MCP server bridge connecting to `@modelcontextprotocol/server-github` via user-configured tokens.
- [ ] Local repository clone inspection (reading AST via treesitter or TypeScript compiler API).
