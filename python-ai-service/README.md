# OpenOrbit Python AI Service

The Python AI Service is OpenOrbit's specialized AI layer for repository context processing, Python code analysis, issue analysis, and contribution planning. It uses FastAPI and a locally configured Ollama model for AI-assisted issue analysis.

## Responsibilities & Layer Boundaries

- **Role:** Analyze Python code structure, identify relevant repository files, analyze issues, and generate structured contribution plans.
- **Communication Flow:** `React Frontend (client/)` → `Express Backend (server/)` → `Python AI Service (python-ai-service/)`
- **AI Inference:** Uses a locally running Ollama model configured through environment variables.
- **Security Boundary:** The browser must not call this service directly. The service does not independently execute arbitrary commands, modify repository files, or submit pull requests.
- **Contribution Planning:** Generates recommendations for human review; it does not implement changes automatically.

## Features

- Python source validation and extraction of imports, functions, and classes.
- Repository file discovery based on a search query.
- Issue analysis with summaries, categories, referenced files, and suggested investigation steps.
- Ollama integration with configurable URL, model, and timeout.
- Structured contribution plans with relevant files, implementation steps, testing suggestions, and potential risks.
- Unit and API tests for core analysis, Ollama handling, and contribution planning.

## Directory Structure

- `app/core/` — Application configuration.
- `app/api/routes/` — FastAPI API routes.
- `app/schemas/` — Pydantic request and response schemas.
- `app/services/` — Code analysis, issue analysis, Ollama client, and contribution planning.
- `app/tests/` — Unit and API integration tests.
- `app/main.py` — FastAPI application entry point.

## Requirements

- Python 3.10 or newer.
- Dependencies listed in `requirements.txt`.
- [Ollama](https://ollama.com/) installed and running locally.
- A model downloaded and available in Ollama.

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

### 3. Configure Ollama

Start Ollama and download a model supported by your machine. For example:

```bash
ollama pull llama3.2
```

Create a `.env` file in `python-ai-service/` using `.env.example` as a reference. Configure the variable names supported by `app/core/config.py`.

Typical settings include:

- `OLLAMA_BASE_URL` — Ollama API base URL.
- `OLLAMA_MODEL` — Model name available in Ollama.
- `OLLAMA_TIMEOUT` — Request timeout.

Check `.env.example` and `app/core/config.py` for the exact supported names and default values.

### 4. Start the service

From `python-ai-service/`:

```bash
python -m uvicorn app.main:app --reload
```

The service should be available at `http://127.0.0.1:8000`.

Interactive API documentation: `http://127.0.0.1:8000/docs`

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Basic service information |
| POST | `/analysis/code` | Analyze Python source code |
| POST | `/analysis/issue` | Analyze an issue |
| POST | `/contribution/plan` | Generate a structured contribution plan |

Use Swagger UI at `/docs` to inspect request schemas and try the endpoints. Refer to the registered route modules for the current request and response contracts.

## Testing

Run tests from the repository root:

```powershell
python -m pytest python-ai-service/app/tests/ -v
```

The test suite covers code analysis, issue analysis, Ollama client behavior, and contribution planning. Ollama-dependent behavior should be mocked in unit tests so tests do not require live model inference.

## Error Handling & Troubleshooting

- **Ollama connection failure:** Ensure Ollama is running and the configured base URL is reachable.
- **Model unavailable:** Verify the configured model name and download the model if necessary.
- **Request timeout:** Check local model performance and adjust the configured timeout if appropriate.
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

