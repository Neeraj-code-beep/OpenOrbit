# OpenOrbit Python AI Service

The Python AI Service is OpenOrbit's specialized AI layer for repository context processing, Python code analysis, issue analysis, and contribution planning. It uses FastAPI and can use a locally configured Ollama model for AI-assisted analysis.

## Architecture & Responsibilities

- **Communication flow:** `React Frontend (client/)` -> `Express Backend (server/)` -> `Python AI Service (python-ai-service/)`.
- **Repository context:** Discovers repository files and extracts relevant code context.
- **Analysis and planning:** Analyzes Python source and issues, and generates structured contribution plans.
- **Security boundary:** The browser must not call this service directly. The service does not independently execute arbitrary commands, modify repository files, or submit pull requests.
- **Human review:** Contribution plans are recommendations; the service does not implement changes automatically.

## Features

- Python source validation and extraction of imports, functions, and classes.
- Repository file discovery and context extraction.
- Issue analysis with summaries, categories, referenced files, and suggested investigation steps.
- Ollama integration for local-model analysis.
- Structured contribution plans with relevant files, implementation steps, testing suggestions, and potential risks.
- Unit and API tests for core analysis, Ollama handling, and contribution planning.

## Project Structure

```text
python-ai-service/
├── API_CONTRACT.md
├── app/
│   ├── api/routes/       # Health, repository, analysis, and contribution endpoints
│   ├── core/             # Configuration and logging
│   ├── schemas/          # Request, response, and shared API models
│   ├── services/         # Context, analysis, planning, and Ollama integration
│   ├── tests/            # Pytest suite
│   └── main.py           # FastAPI application and exception handlers
├── .env.example
└── requirements.txt
```

## Requirements

- Python 3.10 or newer.
- Dependencies listed in `requirements.txt`.
- Ollama installed and running locally for model-backed analysis.
- A model available in Ollama; the default configured model is `llama3:latest`.

## Setup

Run these commands from the `python-ai-service/` directory.

### 1. Create and activate a virtual environment

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
python -m venv .venv
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure the environment

Copy `.env.example` to `.env` (for example, use `Copy-Item .env.example .env` in PowerShell or `cp .env.example .env` on macOS/Linux). Review `app/core/config.py` for supported settings and defaults.

Start Ollama and download a model if needed:

```bash
ollama pull llama3:latest
```

### 4. Start the service

From `python-ai-service/`:

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The service is available at `http://127.0.0.1:8000`.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Basic service information |
| GET | `/api/health` | Health check |
| GET | `/api/health/ready` | Readiness check |
| POST | `/api/repository/tree` | Discover repository files |
| POST | `/api/repository/context` | Build repository context |
| POST | `/api/repository/extract-context` | Extract code context |
| POST | `/api/analysis/code` | Analyze Python source code |
| POST | `/api/analysis/issue` | Analyze an issue |
| POST | `/api/contribution/plan` | Generate a structured contribution plan |

Health endpoints are also available at `/health` and `/health/ready`. Interactive API documentation is available at [`/docs`](http://127.0.0.1:8000/docs), with ReDoc at [`/redoc`](http://127.0.0.1:8000/redoc). See [API_CONTRACT.md](API_CONTRACT.md) and the registered route modules for request and response details.

## Testing

Run tests from the repository root:

```powershell
python -m pytest python-ai-service/app/tests/ -v
```

Ollama-dependent behavior should be mocked in unit tests so tests do not require live model inference.

## Error Handling & Troubleshooting

- **Ollama connection failure:** Ensure Ollama is running and the configured base URL is reachable.
- **Model unavailable:** Verify the configured model and download it if necessary.
- **Request timeout:** Check local model performance and whether Ollama is responding.
- **Empty or invalid model output:** Issue analysis should use its fallback behavior rather than trusting malformed model output.
- **Validation errors:** Inspect the response details in Swagger and compare the request body with the Pydantic schema.
- **Import or startup errors:** Run Uvicorn from `python-ai-service/` so the `app` package can be imported correctly.

## Design Principles

- Keep API contracts explicit and validate structured inputs and outputs.
- Distinguish confirmed repository evidence from hypotheses.
- Never invent repository files or claim a root cause without evidence.
- Keep contribution plans deterministic where possible and require human review.
- Keep AI orchestration within the intended architecture; do not duplicate Gemini or MCP orchestration in this service.

## Current Scope

This service provides analysis and planning assistance. It does not autonomously execute shell commands, edit repository files, or create or merge pull requests.
