# OpenOrbit Python AI Service Integration Contract

This contract defines the service-to-service communication protocol between the Node.js/Express backend and the Python FastAPI AI service.

---

## 1. Service Architecture & Networking

- **Protocol**: HTTP/1.1 REST JSON
- **Default Base URL**: `http://127.0.0.1:8000` (Configurable via `PYTHON_SERVICE_URL` in `server/.env`)
- **Default Timeout**: 10,000 ms (10 seconds)
- **Circuit Breaker / Health Timeout**: 3,000 ms (3 seconds)
- **Security Boundary**: The Node.js server proxies and sanitizes all requests. The browser never calls the Python service directly. No user passwords, session JWTs, or GitHub personal access tokens are sent to the Python service.

---

## 2. Endpoints

### A. Health & Liveness Check

The Node.js backend calls this during system health checks (`GET /api/health`).

- **Path**: `GET /health`
- **Headers**:
  - `Accept: application/json`
  - `User-Agent: OpenOrbit-Backend/1.0`

**Response (200 OK):**
```json
{
  "status": "AVAILABLE",
  "version": "1.0.0",
  "providers": {
    "gemini": true,
    "ollama": false
  }
}
```

If the service returns non-200 or times out after 3 seconds, the Node.js health monitor marks `checks.pythonService.status` as `"UNAVAILABLE"` without crashing the server.

---

### B. Repository Context Analysis *(Confirmed Proposed Contract)*

Used to analyze complex repository context, issue descriptions, and code dependencies before plan generation.

- **Path**: `POST /analyze-context`
- **Headers**:
  - `Content-Type: application/json`
  - `Accept: application/json`
  - `X-Request-Id: <uuid>`

**Request Body:**
```json
{
  "repo": "owner/repository",
  "issue": {
    "title": "Fix memory leak in socket connection pool",
    "body": "Detailed description of the issue from GitHub..."
  },
  "files": [
    {
      "path": "src/pool.js",
      "content": "// snippet of source code..."
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "summary": "High-level summary of the issue and relevant components",
  "suggestedFiles": [
    {
      "filePath": "src/pool.js",
      "reason": "Connection cleanup listener is missing"
    }
  ],
  "risks": [
    "Premature closure of active sockets during high-load intervals"
  ],
  "confidenceScore": 0.88
}
```

**Error Responses:**
- `400 Bad Request`: `{ "error": "Missing required field: repo" }`
- `500 Internal Server Error`: `{ "error": "Model execution failed", "details": "..." }`

---

## 3. Node.js Client Implementation

The backend client is implemented in [`server/src/services/ai/python-ai.client.js`](file:///n:/hackathon-starter/server/src/services/ai/python-ai.client.js):
- Uses `AbortController` with 10s timeout on calls and 3s on health checks.
- Translates network errors into structured `AppError` (`502 PYTHON_SERVICE_ERROR`, `504 PYTHON_SERVICE_TIMEOUT`).
- Does not block local Gemini fallback if the Python service is offline.
