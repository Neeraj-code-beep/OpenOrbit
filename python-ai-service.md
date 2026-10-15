# OpenOrbit Python AI Service Architecture & Member 1 Report

> **Project:** OpenOrbit (Hacktoberfest 2026 — Lucknow × Integral University, supported by Appwrite, DigitalOcean & Major League Hacking)  
> **Component:** Python AI Analysis Service (`python-ai-service/`)  
> **Role:** Member 1 — API, Schemas & Repository Context  
> **Status:** Production-Ready, Tested (13/13 Pytest Suites Passing), Fully Documented  

---

## 1. Executive Summary & System Overview

**OpenOrbit** is an AI-powered assistant designed to lower the barrier to open-source contributions. It guides new contributors from discovering beginner-friendly issues to submitting high-quality, verified pull requests with human oversight.

### High-Level Architecture Flow

```
+---------------------+        +--------------------+        +-----------------------------+
|   React Dashboard   | -----> |   Node.js Server   | -----> |      Python AI Service      |
|  (:5173 - Frontend) | <----- | (:5000 - Express)  | <----- |   (:8000 - FastAPI Layer)   |
+---------------------+        +--------------------+        +-----------------------------+
                                         |                                  |
                                         v                                  v
                               [ Gemini / Cloud LLM ]             [ Local LLM / Ollama ]
                               [ GitHub REST / MCP  ]             [ Tree & Context Engine ]
```

### Layer Boundaries & Security Rules
- **Non-Bypassing Gateway:** The browser frontend never directly queries the Python AI Service; all requests flow through the Node.js Express API.
- **Read-Only / Sandboxed Processing:** The Python layer does not execute arbitrary shell commands, mutate repositories, or submit PRs autonomously.
- **Grounded AI Assistance:** The Python layer performs deterministic repository tree analysis, file-filtering, and token-bounded code extraction to prevent prompt hallucination and prompt injection.

---

## 2. Member 1 Scope of Work & Deliverables

As **Member 1**, the primary responsibility is establishing the foundational FastAPI application, building the repository context engine, standardizing API response contracts, implementing health/repository routes, and establishing the schema contract for Member 2.

### Summary of Completed Deliverables:

| Deliverable Area | Description | Implementation File | Status |
|---|---|---|---|
| **FastAPI Core & Lifespan** | Configured FastAPI instance with request duration logging, CORS middleware, and graceful startup/shutdown lifespan. | `app/main.py` | Complete |
| **Settings & Logging** | Environment parsing with Pydantic `BaseSettings` (`.env` support) and structured logging. | `app/core/config.py`<br>`app/core/logging.py` | Complete |
| **Unified Response Envelopes** | Standardized `APIResponse[T]`, `ErrorResponse`, and `AppException` matching OpenOrbit Express server formats. | `app/schemas/common.py` | Complete |
| **Repository Schemas** | Pydantic v2 data models for `FileNode`, `RepositoryMetadata`, file trees, and code context extraction. | `app/schemas/repository.py` | Complete |
| **Member 2 Contract Schemas** | Request/response schemas for issue analysis, code AST parsing, and contribution planning. | `app/schemas/analysis.py`<br>`app/schemas/contribution.py` | Complete |
| **Repository Context Engine** | Intelligent file-tree hierarchy generation, noise filtering, stack inference, and token-bounded snippet ranking. | `app/services/repository_context.py` | Complete |
| **Health Endpoints** | Liveness (`/api/health`) and readiness (`/api/health/ready`) probes. | `app/api/routes/health.py` | Complete |
| **Repository Endpoints** | Tree parsing (`/api/repository/tree`), context analysis (`/api/repository/context`), and snippet extraction (`/api/repository/extract-context`). | `app/api/routes/repository.py` | Complete |
| **Centralized Error Handling** | Handlers for domain errors (`AppException`), validation errors (422), and unexpected server errors (500). | `app/main.py` | Complete |
| **Test Suite** | Comprehensive Pytest suite covering all Member 1 routes, services, edge cases, and contract checks (13/13 passing). | `app/tests/test_health.py`<br>`app/tests/test_repository.py`<br>`app/tests/test_analysis.py` | Complete |
| **API Contract Specification** | Complete Markdown documentation of shared contracts for Member 2. | `API_CONTRACT.md` | Complete |

---

## 3. Deep Dive: Repository Context & Processing Engine

The core algorithmic innovation in Member 1's layer is the **`RepositoryContextService`** located in `app/services/repository_context.py`.

### 1. Noise & Binary Filtering
When analyzing a repository from GitHub's tree API, repositories often contain thousands of irrelevant or non-textual files. The filtering engine excludes:
- **Build & Dependency Folders:** `node_modules/`, `.git/`, `.venv/`, `dist/`, `build/`, `.next/`, `coverage/`, etc.
- **Media & Binaries:** Images (`.png`, `.jpg`, `.svg`, `.ico`), compiled binaries (`.exe`, `.dll`, `.so`), fonts (`.woff2`, `.ttf`), and compressed archives (`.zip`, `.tar.gz`).
- **Protected Exceptions:** Critical hidden files (like `.github/workflows/` and `.env.example`) are preserved for architectural analysis.

### 2. Hierarchical Tree Construction (`build_file_tree`)
Converts flat lists of repository paths (e.g., from `git ls-files` or GitHub Tree API) into nested `FileNode` trees up to a configurable `max_depth`, categorizing folders and files with automatic extension detection.

### 3. Automated Key File Discovery
The engine automatically identifies and indexes essential open-source files:
- **Documentation:** `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `LICENSE`.
- **Contribution Templates:** Pull Request templates (`.github/pull_request_template.md`).
- **Package Manifests:** `package.json`, `requirements.txt`, `pyproject.toml`, `Cargo.toml`, `go.mod`.

### 4. Tech Stack & Architectural Inference (`analyze_repository_context`)
By analyzing extensions and manifest files, the service determines:
- **Project Type:** Inferred stack (e.g., *Full-Stack Application: React Frontend + Node.js Express + Python AI Service*).
- **Primary Languages:** Detected from file distribution (JavaScript, TypeScript, Python, etc.).
- **Key Directories & Entry Points:** Identifies root folders (`server/`, `client/`, `app/`) and entry scripts (`index.js`, `server.js`, `main.py`).
- **Testing Frameworks:** Detects test runners such as Jest, Vitest, and Pytest.
- **Injection-Safe Markdown Generation:** Outputs a structured, clean Markdown summary ready for LLM prompt injection without risk of prompt escape.

### 5. Token-Bounded Code Context Extraction (`extract_code_context`)
When a user wants to solve an issue, LLMs have strict context window limits:
- **Relevance Scoring:** Computes relevance scores based on query keyword matching in file paths, content term frequencies, and key manifest bonuses.
- **Token Budget Bounding:** Enforces a maximum token limit (default: 8,000 tokens) using a fast heuristic (~4 chars/token).
- **Graceful Truncation:** Large files are trimmed with clear truncation indicators so the model never receives broken payloads.

---

## 4. API Endpoints Specification

Base URL: `http://127.0.0.1:8000/api`

### 1. Health Checks
- **`GET /api/health`**
  - **Purpose:** Liveness probe returning operational status, service uptime, and environment.
  - **Sample Response:**
    ```json
    {
      "success": true,
      "data": {
        "status": "healthy",
        "service": "OpenOrbit Python AI Service",
        "environment": "development",
        "uptime_seconds": 12.4,
        "timestamp": "2026-10-15T17:00:00Z"
      },
      "meta": { "version": "0.1.0" }
    }
    ```
- **`GET /api/health/ready`**
  - **Purpose:** Readiness probe checking Ollama host settings and default local model configurations.

### 2. Repository Context Endpoints
- **`POST /api/repository/tree`**
  - **Purpose:** Accepts a flat array of file paths and returns a filtered hierarchical file tree and indexed key files.
  - **Request Schema:** `FileTreeRequest` (`files: string[]`, `max_depth?: int`, `ignore_patterns?: string[]`)
  - **Response Schema:** `FileTreeResponse` (`tree: FileNode[]`, `key_files: dict`, `total_files: int`, `filtered_files: int`)

- **`POST /api/repository/context`**
  - **Purpose:** Analyzes repository metadata, file paths, and key file contents to generate a grounded overview.
  - **Request Schema:** `RepositoryContextRequest` (`metadata: RepositoryMetadata`, `file_paths: string[]`, `key_files_content?: dict`, `focus_area?: string`)
  - **Response Schema:** `RepositoryContextResponse` (`project_type: string`, `languages_detected: string[]`, `key_directories: string[]`, `entry_points: string[]`, `summary_markdown: string`, `estimated_tokens: int`)

- **`POST /api/repository/extract-context`**
  - **Purpose:** Ranks and extracts relevant code snippets matching a query or issue title within a designated token budget.
  - **Request Schema:** `ExtractCodeContextRequest` (`query: string`, `files: {path, content}[]`, `max_tokens?: int`)
  - **Response Schema:** `ExtractCodeContextResponse` (`selected_snippets: FileSnippet[]`, `total_tokens: int`, `files_considered: int`, `files_included: int`)

---

## 5. Standardized Error Handling Architecture

Errors return a consistent structure that maps cleanly to OpenOrbit's Node.js backend:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request payload validation failed.",
    "details": [
      {
        "field": "body.files",
        "message": "Field required",
        "type": "missing"
      }
    ]
  }
}
```

- **Domain Exceptions (`AppException`):** Throws predictable HTTP status codes (e.g., `400 BAD_REQUEST`, `404 NOT_FOUND`) with machine-readable error codes (`EMPTY_FILE_LIST`, `EMPTY_QUERY`).
- **Validation Errors (HTTP 422):** Formats Pydantic validation errors into clean field-by-field messages.
- **Internal Server Errors (HTTP 500):** Masks sensitive tracebacks in production while logging full error details.

---

## 6. Shared API Contract for Member 2

To enable seamless teamwork without blocking, Member 1 defined and stubbed the contracts for Member 2's components:

| Endpoint | Member 2 Module | Request Schema | Response Schema |
|---|---|---|---|
| `POST /api/analysis/issue` | `app/services/issue_analysis.py` | `IssueAnalysisRequest` | `IssueAnalysisResponse` |
| `POST /api/analysis/code` | `app/services/code_analysis.py` | `CodeAnalysisRequest` | `CodeAnalysisResponse` |
| `POST /api/contribution/plan` | `app/services/contribution_planner.py` | `ContributionPlanRequest` | `ContributionPlanResponse` |

These models match the exact JSON schema required by `server/src/services/contribution/plan.validator.js` in the Express backend, ensuring instant compatibility when Member 2's local LLM (Ollama) is plugged in.

---

## 7. Verification & Testing Results

A comprehensive Pytest test suite was built in `app/tests/`:
- **`test_health.py`:** Tests liveness, readiness, and root service endpoints (4 tests).
- **`test_repository.py`:** Tests tree building, ignore pattern pruning, stack detection, Markdown generation, relevance ranking, and validation errors (6 tests).
- **`test_analysis.py`:** Tests schema contract compliance for Member 2's routes (3 tests).

### Pytest Execution Summary:
```text
============================= test session starts =============================
platform win32 -- Python 3.13.7, pytest-9.1.1, pluggy-1.7.0
rootdir: C:\Users\dilsh\.gemini\antigravity\scratch\OpenOrbit\python-ai-service
collected 13 items

app/tests/test_analysis.py::test_issue_analysis_contract PASSED          [  7%]
app/tests/test_analysis.py::test_code_analysis_contract PASSED           [ 15%]
app/tests/test_analysis.py::test_contribution_plan_contract PASSED       [ 23%]
app/tests/test_health.py::test_health_check_api PASSED                   [ 30%]
app/tests/test_health.py::test_health_check_alias PASSED                 [ 38%]
app/tests/test_health.py::test_health_readiness PASSED                   [ 46%]
app/tests/test_health.py::test_root_index PASSED                         [ 53%]
app/tests/test_repository.py::test_parse_repository_tree_success PASSED  [ 61%]
app/tests/test_repository.py::test_parse_repository_tree_empty_validation PASSED [ 69%]
app/tests/test_repository.py::test_extract_repository_context_success PASSED [ 76%]
app/tests/test_repository.py::test_extract_repository_context_missing_metadata PASSED [ 84%]
app/tests/test_repository.py::test_extract_code_context_ranking PASSED   [ 92%]
app/tests/test_repository.py::test_extract_code_context_empty_query PASSED [100%]

======================== 13 passed in 0.85s =========================
```

---

## 8. How to Run Locally

### 1. Activate Environment
```powershell
cd python-ai-service
.\.venv\Scripts\Activate.ps1
```

### 2. Run Tests
```powershell
pytest -v
```

### 3. Launch the Development Server
```powershell
uvicorn app.main:app --reload --port 8000
```

- **Interactive Swagger Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Documentation:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Probe:** [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
