# PRPath 🚀

> **AI-Powered Open-Source Contribution Assistant**  
> Bridging the gap from discovering a real GitHub issue to submitting a high-quality Pull Request.

---

## Overview

Contributing to open-source can be intimidating: understanding an unfamiliar codebase, isolating where a bug lives, setting up tests, and knowing how to structure a pull request takes time.

**PRPath** guides developers through every step of their open-source journey:
1. **Discover Real Issues:** Search live GitHub issues filtered by beginner-friendly labels (`good-first-issue`, `help wanted`), languages, and keywords.
2. **Understand the Repository:** Inspect stars, forks, open issues, licenses, default branches, and verified README context.
3. **AI-Assisted Contribution Planning:** Generate structured, actionable roadmaps powered by **Google Gemini** (cloud) or **Ollama** (offline local model), complete with target files, implementation steps, risks, acceptance criteria, and test plans.
4. **Verified Facts vs AI Suggestions:** PRPath clearly distinguishes verified repository files from model suggestions.
5. **Draft Pull Request Descriptions:** Generates ready-to-use, conventional PR descriptions summarizing the fix, verified files, and verification checklists.
6. **Model Context Protocol (MCP):** Prepared with the official `@modelcontextprotocol/sdk` client for extensible tool execution.

---

## Architecture

```
PRPath/
├── client/          # React 19 + Vite 8 frontend (glassmorphism UI)
├── server/          # Express 5 backend API
│   ├── src/
│   │   ├── config/       # Validated environment configuration
│   │   ├── controllers/  # Health, GitHub, AI, and Contribution controllers
│   │   ├── services/
│   │   │   ├── github/   # Real GitHub REST integration with rate limiting
│   │   │   ├── ai/       # Multi-provider routing (Gemini + Ollama)
│   │   │   ├── mcp/      # Official Model Context Protocol client
│   │   │   └── contribution/ # Plan validation and PR description generator
│   │   ├── middleware/   # Request-id, CORS, error handling, validation
│   │   └── tests/        # Native Node.js test runner suites
└── docs/            # Comprehensive architecture and API documentation
```

---

## Quickstart

### 1. Prerequisites
- **Node.js**: `v20+` (tested on `v22.18.0`)
- **npm**: `10+`
- (Optional) [Google AI Studio API Key](https://aistudio.google.com/) for hosted Gemini / Gemma inference
- (Optional) [Ollama](https://ollama.ai/) for offline local inference

### 2. Setup
```bash
# Clone and enter workspace
git clone <repo-url>
cd PRPath

# Install dependencies (root, server, client)
npm install
npm --prefix server install
npm --prefix client install

# Setup environment variables
cp .env.example .env
```

### 3. Configure `.env`
Edit `.env` with your settings:
```ini
PORT=5000
CORS_ORIGIN=http://localhost:5173

# Optional: Higher GitHub rate limits (5,000 req/hr)
GITHUB_TOKEN=

# AI Provider ('gemini' or 'ollama')
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Optional: Ollama settings
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=llama3:latest
```

### 4. Run Development Servers
```bash
npm run dev
```
- **Web UI:** [http://localhost:5173](http://localhost:5173)
- **API Server:** [http://localhost:5000](http://localhost:5000)
- **Live Healthcheck:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## Verification & Testing

```bash
# Run backend integration & unit tests
npm test

# Run frontend static analysis
npm run lint

# Build production bundle
npm run build
```

---

## Documentation Index

Explore the complete documentation in `docs/`:
- [Architecture & Design](docs/architecture.md)
- [API Routes Specification](docs/api-routes.md)
- [AI Routing & Model Fallback](docs/ai-routing.md)
- [Data Flow Tracing](docs/data-flow.md)
- [Design System & UI Components](docs/design.md)
- [Model Context Protocol (MCP) Guide](docs/mcp-tools.md)
- [Security & Prompt Injection Defenses](docs/security.md)
- [Setup & Local Run Guide](docs/setup.md)
- [Testing & Quality Assurance](docs/testing.md)
- [Contributing Guidelines](docs/contributing.md)
- [MVP Plan & Future Roadmap](docs/mvp-plan.md)

---

## License
Licensed under the [ISC License](LICENSE).
