# OpenOrbit Frontend Integration Guide

This guide is designed for the client development team building the React/Vite interface. It provides exact API patterns, authentication session handling, cookie management, live tested response schemas, and error expectations for integrating with the Node.js/Express backend.

---

## 1. Network & Proxy Architecture

The OpenOrbit backend runs on port **5000** (`http://localhost:5000` / `http://0.0.0.0:5000`).
The React + Vite frontend runs on port **5173** (`http://localhost:5173`).

### Two Ways to Call APIs from Frontend:

#### A. Via Vite Proxy (Recommended for local dev)
In `client/vite.config.js`, requests starting with `/api` are automatically proxied to `http://localhost:5000`. You can make relative requests:
```javascript
// Automatically routed to http://localhost:5000/api/health
const res = await fetch('/api/health');
```

#### B. Direct to Backend (with CORS)
CORS is explicitly configured to allow `http://localhost:5173` with credentials:
```javascript
const res = await fetch('http://localhost:5000/api/health', {
  credentials: 'include',
});
```

### Route Aliases
All backend endpoints are available under **both** prefixes:
- `/api/...` (Direct alias used by `client/src/lib/apiClient.js`)
- `/api/v1/...` (Versioned alias)

---

## 2. Authentication Flow

All authentication is session-based and handled via an **HTTP-only, SameSite=Lax cookie** named `openorbit_token`.

### A. Local Registration & Login
- **Register:** `POST /api/v1/auth/register` (or `POST /api/auth/register`)
- **Login:** `POST /api/v1/auth/login` (or `POST /api/auth/login`)

```javascript
async function login(email, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Login failed');
  }

  // Session cookie is automatically stored by the browser
  return data.data.user;
}
```

### B. Session Verification (`App.jsx` Initial Load)
```javascript
async function checkCurrentSession() {
  const res = await fetch('/api/auth/me', {
    method: 'GET',
    credentials: 'include',
  });

  if (res.status === 401) {
    return null; // Guest user
  }

  const data = await res.json();
  return data.data.user; // { id, name, email, githubUsername, githubAvatarUrl, authProviders, ... }
}
```

### C. Logout
```javascript
async function logout() {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}
```

---

## 3. GitHub OAuth Integration

### Option 1: Full-Page Redirect (Recommended for simplicity)
```javascript
// Standalone GitHub login/registration:
function startGitHubLogin() {
  window.location.href = 'http://localhost:5000/api/auth/github?intent=auth&redirectTo=/dashboard';
}

// Linking GitHub to existing logged-in account (requires reauth ticket first):
async function startGitHubLink() {
  // Step 1: Reauthenticate to obtain single-use ticket
  const password = prompt('Please re-enter your OpenOrbit password to link GitHub:');
  const reauthRes = await fetch('/api/auth/reauth', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const reauthData = await reauthRes.json();
  if (!reauthRes.ok) throw new Error(reauthData.error?.message || 'Reauth failed');

  const ticket = reauthData.data.reauthTicket;

  // Step 2: Redirect to GitHub linking endpoint
  window.location.href = `http://localhost:5000/api/auth/github?intent=link&ticket=${encodeURIComponent(ticket)}&redirectTo=/settings`;
}
```

---

## 4. GitHub Operations & Live Tested Examples

### A. Health Check (`GET /api/health`)
Directly verifies live dependencies (GitHub API, Database, AI providers, MCP):

**Request:**
```bash
curl http://localhost:5000/api/health
```

**Real Response (200 OK):**
```json
{
  "status": "DEGRADED_AI_UNAVAILABLE",
  "timestamp": "2026-10-15T16:51:45.114Z",
  "uptimeSeconds": 483,
  "service": "OpenOrbit Backend API",
  "version": "1.0.0",
  "environment": "development",
  "checks": {
    "github": {
      "status": "HEALTHY",
      "authenticated": false,
      "rateLimit": { "limit": 60, "remaining": 60, "resetsAt": "..." },
      "error": null
    },
    "ai": {
      "activeProvider": "gemini",
      "gemini": { "status": "UNCONFIGURED", "message": "GEMINI_API_KEY is not set" },
      "ollama": { "status": "OFFLINE", "host": "http://127.0.0.1:11434" }
    },
    "mcp": {
      "status": "PENDING_SERVER_CONFIG",
      "registeredToolsCount": 5
    },
    "pythonService": {
      "status": "STANDBY",
      "url": "http://127.0.0.1:8000"
    },
    "database": {
      "readyState": 1,
      "status": "CONNECTED"
    }
  }
}
```

### B. Repository Inspection (`GET /api/github/repositories/:owner/:repo`)

**Request:**
```javascript
const repo = await api.getRepository('expressjs', 'express');
```

**Real Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 237159,
    "name": "express",
    "fullName": "expressjs/express",
    "owner": "expressjs",
    "description": "Fast, unopinionated, minimalist web framework for node.",
    "htmlUrl": "https://github.com/expressjs/express",
    "starsCount": 69571,
    "forksCount": 25237,
    "openIssuesCount": 236,
    "language": "JavaScript",
    "license": "MIT",
    "defaultBranch": "master",
    "isArchived": false,
    "updatedAt": "2026-10-15T15:44:48Z",
    "readmeSnippet": "# Express\n\nFast, unopinionated, minimalist web framework..."
  },
  "rateLimit": {
    "limit": 60,
    "remaining": 59,
    "reset": 1792086736
  }
}
```

### C. Issue Search (`GET /api/github/issues`)

**Query Parameters:**
- `query` (string): Keyword search or `repo:owner/name`
- `label` (string, default: `good-first-issue`): Label filter (pass `""` for all issues)
- `language` (string): e.g. `javascript`
- `page` (number, default: 1)
- `per_page` (number, default: 15, max: 100)

**Real Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 5749758908,
      "number": 7510,
      "title": "res.send(DataView) silently drops the view's bytes",
      "body": "res.send() recognizes DataView as binary...",
      "state": "open",
      "htmlUrl": "https://github.com/expressjs/express/issues/7510",
      "createdAt": "2026-10-07T18:20:22Z",
      "updatedAt": "2026-10-07T18:20:22Z",
      "author": "nikhiljangid120",
      "authorAvatar": "https://avatars.githubusercontent.com/u/161968345?v=4",
      "commentsCount": 0,
      "repository": {
        "owner": "expressjs",
        "name": "express",
        "fullName": "expressjs/express"
      },
      "labels": [],
      "isPullRequest": false
    }
  ],
  "pagination": {
    "totalCount": 108,
    "page": 1,
    "perPage": 15
  },
  "rateLimit": {
    "limit": 10,
    "remaining": 8,
    "reset": 1792083205
  }
}
```

---

## 5. Failure Cases & Standard Error Format

All errors return JSON with HTTP status >= 400:

```json
{
  "success": false,
  "error": {
    "code": "GITHUB_NOT_FOUND",
    "message": "GitHub resource not found at /repos/expressjs/nonexistent-repo-xyz",
    "details": null,
    "requestId": "87fcbb15-2aca-48d3-be17-a915903dd98f"
  }
}
```

### Tested Failure Status Codes:

| Scenario | HTTP Status | Error Code | Response Details |
|---|---|---|---|
| **Invalid repository name** | `400 Bad Request` | `VALIDATION_ERROR` | `["owner contains invalid characters"]` |
| **Missing required fields** | `400 Bad Request` | `VALIDATION_ERROR` | Description of missing properties |
| **Unauthorized access** | `401 Unauthorized` | `UNAUTHORIZED` | `"Authentication required: no active session found"` |
| **Consequential action approval** | `403 Forbidden` | `ACTION_APPROVAL_REQUIRED` | Tool name requiring user approval |
| **Repository not found** | `404 Not Found` | `GITHUB_NOT_FOUND` | Upstream resource path |
| **Issue not found** | `404 Not Found` | `GITHUB_NOT_FOUND` | Specific issue path |
| **Duplicate save** | `409 Conflict` | `ISSUE_ALREADY_SAVED` | Issue already in collection |
| **Rate limit reached** | `429 Too Many Requests` | `RATE_LIMIT_EXCEEDED` | `Retry-After` header + `details.retryAfterSeconds` |
| **GitHub API down/offline** | `502 Bad Gateway` | `GITHUB_API_ERROR` | Upstream network failure message |
