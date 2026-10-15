# OpenOrbit Python AI Service — API Contract Specification

> **Status:** Agreed & Established by Member 1 for Member 2 integration  
> **Base URL:** `http://127.0.0.1:8000/api`  
> **Service Architecture:** React Dashboard (`:5173`) -> Express Server (`:5000`) -> Python AI Service (`:8000`)

---

## 1. Unified Response Envelopes

All endpoints in the Python AI Service return standardized envelopes matching OpenOrbit conventions.

### Success Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": { ... }
}
```

### Error Envelope
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

## 2. Health & Operational Endpoints (Member 1)

### `GET /api/health`
Liveness probe checking service uptime and health status.
- **Request:** None
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "OpenOrbit Python AI Service",
    "environment": "development",
    "uptime_seconds": 45.2,
    "timestamp": "2026-10-15T14:30:00Z"
  },
  "meta": {
    "version": "0.1.0"
  }
}
```

### `GET /api/health/ready`
Readiness probe verifying Ollama / local model configuration.
- **Request:** None
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "ready": true,
    "ollama_base_url": "http://127.0.0.1:11434",
    "default_model": "llama3:latest"
  }
}
```

---

## 3. Repository Context Endpoints (Member 1)

### `POST /api/repository/tree`
Parses a flat file list into a filtered hierarchy, stripping noise (`node_modules`, `.git`, binaries) and indexing key files.

- **Request Body:**
```json
{
  "files": [
    "README.md",
    "CONTRIBUTING.md",
    "package.json",
    "server/src/server.js",
    "node_modules/express/index.js",
    ".git/config"
  ],
  "ignore_patterns": [".cache"],
  "max_depth": 10
}
```

- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "total_files": 6,
    "filtered_files": 4,
    "total_directories": 2,
    "tree": [
      {
        "path": "server",
        "name": "server",
        "type": "directory",
        "children": [
          {
            "path": "server/src",
            "name": "src",
            "type": "directory",
            "children": [
              {
                "path": "server/src/server.js",
                "name": "server.js",
                "type": "file",
                "extension": "js"
              }
            ]
          }
        ]
      },
      {
        "path": "CONTRIBUTING.md",
        "name": "CONTRIBUTING.md",
        "type": "file",
        "extension": "md"
      },
      {
        "path": "package.json",
        "name": "package.json",
        "type": "file",
        "extension": "json"
      },
      {
        "path": "README.md",
        "name": "README.md",
        "type": "file",
        "extension": "md"
      }
    ],
    "key_files": {
      "readme": "README.md",
      "contributing": "CONTRIBUTING.md",
      "package_json": "package.json"
    }
  },
  "meta": {
    "total_input_files": 6,
    "filtered_files": 4
  }
}
```

---

### `POST /api/repository/context`
Generates a structured, injection-safe overview of the repository's stack, entry points, configuration, and documentation.

- **Request Body:**
```json
{
  "metadata": {
    "owner": "Neeraj-code-beep",
    "name": "OpenOrbit",
    "default_branch": "main",
    "language": "JavaScript",
    "stars": 15,
    "open_issues": 5
  },
  "file_paths": [
    "README.md",
    "package.json",
    "server/src/server.js",
    "client/src/App.jsx",
    "python-ai-service/app/main.py"
  ],
  "key_files_content": {
    "README.md": "# OpenOrbit\nAI-powered contribution guide."
  },
  "focus_area": "server"
}
```

- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "project_type": "Full-Stack Application (React + Node.js Express + Python AI Service)",
    "languages_detected": ["JavaScript", "Python"],
    "key_directories": ["client", "python-ai-service", "server"],
    "entry_points": ["server/src/server.js", "python-ai-service/app/main.py"],
    "config_files": ["package.json"],
    "test_frameworks": ["Jest / Node Test Runner"],
    "documentation_files": ["README.md"],
    "summary_markdown": "# Repository Context: Neeraj-code-beep/OpenOrbit...",
    "estimated_tokens": 128
  },
  "meta": {
    "repo": "Neeraj-code-beep/OpenOrbit",
    "estimated_tokens": 128
  }
}
```

---

### `POST /api/repository/extract-context`
Ranks and extracts the most relevant source files or snippets for an issue/query within a strict token limit.

- **Request Body:**
```json
{
  "query": "fix health check endpoint error",
  "files": [
    {
      "path": "server/src/routes/health.routes.js",
      "content": "router.get('/health', (req, res) => res.json({ status: 'ok' }));"
    },
    {
      "path": "client/src/App.jsx",
      "content": "export default function App() { return <div>OpenOrbit</div>; }"
    }
  ],
  "max_tokens": 4000
}
```

- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "query": "fix health check endpoint error",
    "selected_snippets": [
      {
        "path": "server/src/routes/health.routes.js",
        "content": "router.get('/health', (req, res) => res.json({ status: 'ok' }));",
        "language": "JavaScript",
        "token_estimate": 17,
        "relevance_score": 0.35
      }
    ],
    "total_tokens": 17,
    "files_considered": 2,
    "files_included": 1
  },
  "meta": {
    "budget_tokens": 4000,
    "used_tokens": 17,
    "matched_count": 1
  }
}
```

---

## 4. Analysis & Contribution Endpoints (Member 2 Contract)

### `POST /api/analysis/issue`
- **Request Body:**
```json
{
  "issue_title": "Add rate limiter for GitHub requests",
  "issue_body": "Requests to GitHub API are failing with 403 when unauthenticated.",
  "issue_labels": ["enhancement", "good first issue"]
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "issue_category": "enhancement",
    "difficulty_estimate": "good-first-issue",
    "problem_statement": "Add rate limiter for GitHub requests",
    "suspected_components": [],
    "key_technical_terms": ["github", "api", "rate limiter"],
    "recommended_approach": "Locate GitHub client service and attach rate limiting wrapper.",
    "reproduction_steps": "Simulate rate limit exhaustion using mock HTTP client."
  }
}
```

---

### `POST /api/analysis/code`
- **Request Body:**
```json
{
  "file_path": "app/services/example.py",
  "code_content": "def calculate(x): return x * 2",
  "language": "Python"
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "file_path": "app/services/example.py",
    "language": "Python",
    "line_count": 1,
    "symbols": [
      {
        "name": "calculate",
        "type": "function",
        "line_start": 1,
        "line_end": 1,
        "docstring": null
      }
    ],
    "dependencies": [],
    "complexity_notes": "File contains 1 lines and 1 identified symbols.",
    "relevant_sections": []
  }
}
```

---

### `POST /api/contribution/plan`
Generates a structured contribution plan conforming to OpenOrbit's plan validation specification.

- **Request Body:**
```json
{
  "issueTitle": "Fix broken health check probe",
  "issueBody": "Health endpoint returns 500 when database is sleeping.",
  "repoOwner": "Neeraj-code-beep",
  "repoName": "OpenOrbit",
  "verifiedFiles": ["server/src/routes/health.routes.js"]
}
```

- **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "issueSummary": "Action plan for: Fix broken health check probe",
    "problemInterpretation": "Health endpoint returns 500 when database is sleeping.",
    "relevantFiles": [
      {
        "filePath": "server/src/routes/health.routes.js",
        "reason": "Primary verified repository component",
        "isVerified": true
      }
    ],
    "implementationSteps": [
      {
        "stepNumber": 1,
        "title": "Reproduce the issue locally",
        "description": "Inspect requirements described in issue.",
        "safetyNotes": "Do not make edits until reproduction confirmed."
      }
    ],
    "dependenciesAndRisks": ["Potential interface regressions."],
    "acceptanceCriteria": ["Issue is resolved.", "Tests pass."],
    "testPlan": ["Run existing unit test suite."],
    "uncertaintiesAndQuestions": [],
    "suggestedPR": {
      "title": "fix: resolve Fix broken health check probe",
      "description": "## Summary of Changes\n- Resolves reported issue"
    }
  }
}
```

---

## 5. Division of Responsibilities

| Responsibility Area | Owner | Module Files | Status |
|---|---|---|---|
| FastAPI setup & Lifespan | Member 1 | `app/main.py` | Complete & Tested |
| App Configuration & Logging | Member 1 | `app/core/config.py`, `app/core/logging.py` | Complete & Tested |
| Error Handling & Envelopes | Member 1 | `app/schemas/common.py`, `app/main.py` | Complete & Tested |
| Repository & Tree Processing | Member 1 | `app/schemas/repository.py`, `app/services/repository_context.py`, `app/api/routes/repository.py` | Complete & Tested |
| Health & Readiness Probes | Member 1 | `app/api/routes/health.py` | Complete & Tested |
| Base Test Infrastructure | Member 1 | `app/tests/conftest.py`, `app/tests/test_health.py`, `app/tests/test_repository.py` | Complete (13/13 passing) |
| Issue Analysis Logic | Member 2 | `app/services/issue_analysis.py` | Scaffolded & Contract Tested |
| Code AST & Structure Analysis | Member 2 | `app/services/code_analysis.py` | Scaffolded & Contract Tested |
| Contribution Planning Logic | Member 2 | `app/services/contribution_planner.py` | Scaffolded & Contract Tested |
| Ollama / Local Model Integration | Member 2 | Services calling Ollama URL from `get_settings()` | Ready for integration |
