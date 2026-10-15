# OpenOrbit Python AI Service Contribution & Architecture Guide

> **Component:** Python AI Analysis Service (`python-ai-service/`)  
> **Author:** Member 1 — API, Schemas & Repository Context  
> **Target Audience:** Frontend Team (`client/`), Backend Team (`server/`), and Member 2  
> **Status:** Production-Ready, 13/13 Tests Passing  

---

## 1. Overview for Frontend & Backend Developers

This document explains what the **Python AI Service** does, how it connects with the rest of OpenOrbit, and how the **Frontend (`client/`)** and **Node.js Server (`server/`)** should interact with it.

### System Data Flow
```
[ React Dashboard (client/) ]
              │
              ▼  (HTTP /api/)
[ Express Backend (server/) ]
              │
              ├──► [ GitHub REST API / MCP Client ] (Fetches real repo files & issues)
              ├──► [ Google Gemini API ] (Interactive cloud AI assistant)
              │
              ▼  (Internal HTTP :8000)
[ Python AI Service (python-ai-service/) ]
              ├── 1. Filters & builds clean repository file tree (removes noise)
              ├── 2. Grounded repository context & tech stack detection
              ├── 3. Token-budgeted relevant code extraction (protects prompt limit)
              └── 4. Offline / Local LLM fallback via Ollama (:11434)
```

> ⚠️ **Important Security Rule:**  
> The React Frontend **must not** call the Python service directly (`:8000`). The browser talks **only** to the Express server (`:5000`), and Express securely delegates repository analysis and planning tasks to the Python service.

---

## 2. What Member 1 Built (Current Working Capabilities)

### A. Repository Tree Parsing (`POST /api/repository/tree`)
- **What it does:** Takes a flat list of hundreds or thousands of repository file paths (from GitHub API) and converts them into a clean, hierarchical tree.
- **Noise Filtering:** Automatically filters out clutter like `node_modules/`, `.git/`, `.venv/`, `dist/`, `build/`, `.cache/`, and media/binary files (`.png`, `.exe`, `.so`).
- **Key File Detection:** Instantly indexes `README.md`, `CONTRIBUTING.md`, `LICENSE`, `package.json`, and manifests.
- **Frontend Usage:** The dashboard can render a neat file tree without choking on 10,000 files in `node_modules`.

### B. Grounded Repository Architecture Analysis (`POST /api/repository/context`)
- **What it does:** Scans the repository's files and metadata to detect:
  - Inferred Project Type (e.g. *Full-Stack App: React + Express + Python*).
  - Programming languages and primary entry points (`server.js`, `main.py`).
  - Active test frameworks (Jest, Vitest, Pytest).
  - Generates an injection-safe Markdown summary ready for the contribution planning page.

### C. Token-Bounded Code Context Extraction (`POST /api/repository/extract-context`)
- **What it does:** Given an issue or search query (e.g. *"fix CORS error in backend"*), it scores and ranks all repository files and returns only the most relevant code snippets.
- **Token Protection:** Strictly limits returned snippets to a configured token budget (e.g., max 4,000 or 8,000 tokens) so LLM prompts never fail or exceed context limits.

### D. Service Health Probes
- `GET /api/health` — Returns service uptime, environment, and operational health.
- `GET /api/health/ready` — Verifies connection to Ollama local model.

---

## 3. Standard API Contract & Response Format

All responses follow OpenOrbit's unified envelope format:

### Success Format:
```json
{
  "success": true,
  "data": { ... },
  "meta": { ... }
}
```

### Error Format:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable explanation of error.",
    "details": null
  }
}
```

---

## 4. Endpoints Ready for Server & Frontend Integration

| Endpoint | Method | Purpose | Input Payload | Output |
|---|---|---|---|---|
| `/api/health` | GET | Liveness health check | None | Status & Uptime |
| `/api/health/ready` | GET | Ollama readiness check | None | Model config status |
| `/api/repository/tree` | POST | Filter noise & build hierarchy | `{"files": [...]}` | Nested tree & key files |
| `/api/repository/context` | POST | Generate repo architecture summary | `{"metadata": {...}, "file_paths": [...]}` | Project type, entry points, markdown summary |
| `/api/repository/extract-context` | POST | Find code snippets for an issue | `{"query": "...", "files": [...]}` | Ranked snippets within token budget |
| `/api/analysis/issue` | POST | Semantic issue breakdown *(Member 2)* | `{"issue_title": "..."}` | Category, difficulty, recommended approach |
| `/api/contribution/plan` | POST | Step-by-step contribution roadmap *(Member 2)* | `{"issueTitle": "...", "verifiedFiles": [...]}` | Actionable steps & draft PR template |

---

## 5. How to Run Locally

```bash
# 1. Navigate to directory
cd python-ai-service

# 2. Activate virtual environment
.\.venv\Scripts\Activate.ps1    # (Windows)
source .venv/bin/activate       # (Linux/macOS)

# 3. Run all tests
pytest -v

# 4. Start the live API server
uvicorn app.main:app --reload --port 8000
```

- **Interactive API Documentation (Swagger UI):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Shared API Contract Specification:** see [`python-ai-service/API_CONTRACT.md`](../python-ai-service/API_CONTRACT.md)
