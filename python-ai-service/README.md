# OpenOrbit Python AI Service

This service provides specialized repository context processing, code structure analysis, issue analysis, and contribution planning assistance for OpenOrbit.

## Architecture & Responsibilities

- **Role:** Specialized repository context processing, code structure analysis, issue analysis, and contribution planning assistance.
- **Communication Flow:**
  `React Frontend (client/)` -> `Express Backend (server/)` -> `Python AI Service (python-ai-service/)`
- **Security Boundary:** The browser never calls this service directly. This service does not independently execute arbitrary commands, modify project files, or submit pull requests.

## Directory Structure

```
python-ai-service/
├── app/
│   ├── core/              # Configuration (pydantic-settings) & structured logging
│   │   ├── config.py
│   │   └── logging.py
│   ├── schemas/           # Pydantic models & standard response envelopes
│   │   ├── common.py
│   │   ├── repository.py
│   │   ├── analysis.py
│   │   └── contribution.py
│   ├── services/          # Business logic & algorithms
│   │   ├── repository_context.py
│   │   ├── code_analysis.py
│   │   ├── issue_analysis.py
│   │   └── contribution_planner.py
│   ├── api/
│   │   └── routes/        # FastAPI route definitions
│   │       ├── health.py
│   │       ├── repository.py
│   │       ├── analysis.py
│   │       └── contribution.py
│   ├── tests/             # Pytest test suite
│   │   ├── conftest.py
│   │   ├── test_health.py
│   │   ├── test_repository.py
│   │   └── test_analysis.py
│   └── main.py            # FastAPI entry point & exception handlers
├── .env.example           # Environment template
├── requirements.txt       # Dependencies
└── API_CONTRACT.md        # Member 1 & Member 2 API specification
```

## Quickstart

### 1. Create and Activate Virtual Environment

```bash
# Inside python-ai-service/
python -m venv .venv

# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1

# On Linux/macOS:
source .venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
```

### 4. Run the Service

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Interactive API Docs (Swagger UI):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative Docs (ReDoc):** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Check:** [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

### 5. Run Tests

```bash
pytest -v
```
