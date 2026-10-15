# OpenOrbit Python AI Service

This directory is the reserved structural layer for OpenOrbit's specialized Python AI analysis service.

## Responsibility & Layer Boundaries
- **Role:** Specialized repository context processing, code structure analysis, issue analysis, and contribution planning assistance.
- **Communication Flow:**
  `React Frontend (client/)` -> `Express Backend (server/)` -> `Python AI Service (python-ai-service/)`
- **Security Boundary:** The browser never calls this service directly. This service does not independently execute arbitrary commands, modify project files, or submit pull requests.

## Directory Structure
- `app/core/`: Configuration and logging utilities.
- `app/api/routes/`: FastAPI route modules (health, repository, analysis, contribution).
- `app/schemas/`: Pydantic request and response schemas.
- `app/services/`: Specialized analysis and planning services.
- `app/tests/`: Service test suites.
- `app/main.py`: FastAPI application entry point.

*Note: At this stage, this service contains the designated folder and module structure with placeholder modules only.*
