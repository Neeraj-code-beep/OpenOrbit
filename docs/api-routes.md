# API Routes Specification

All API routes are prefixed under `/api`.

## 1. Health & Telemetry

### `GET /api/health`
Performs live health checks across all backend dependencies (GitHub rate limits, AI provider status, Ollama reachability, MCP status).

**Response (200 OK):**
```json
{
  "status": "HEALTHY",
  "timestamp": "2026-10-15T10:00:00.000Z",
  "uptimeSeconds": 142,
  "service": "PRPath Backend API",
  "version": "1.0.0",
  "environment": "development",
  "checks": {
    "github": {
      "status": "HEALTHY",
      "authenticated": false,
      "rateLimit": { "limit": 60, "remaining": 58, "resetsAt": "..." }
    },
    "ai": {
      "activeProvider": "gemini",
      "gemini": { "status": "AVAILABLE", "model": "gemini-2.5-flash" },
      "ollama": { "status": "OFFLINE", "host": "http://127.0.0.1:11434" }
    },
    "mcp": {
      "status": "PENDING_SERVER_CONFIG",
      "registeredToolsCount": 3
    }
  }
}
```

---

## 2. GitHub Operations

### `GET /api/github/issues`
Searches real GitHub issues based on query keywords, language, and labels.

**Query Parameters:**
- `query` (optional string): Keyword search
- `label` (optional string, default: `good-first-issue`): Label filter
- `language` (optional string): Programming language
- `page` (optional integer, default: 1): Page number
- `per_page` (optional integer, default: 15, max: 100): Page size

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1928374,
      "number": 42,
      "title": "Fix memory leak in socket connection pool",
      "body": "Issue details...",
      "state": "open",
      "htmlUrl": "https://github.com/org/repo/issues/42",
      "createdAt": "2026-10-15T00:00:00Z",
      "author": "octocat",
      "commentsCount": 4,
      "repository": { "owner": "org", "name": "repo", "fullName": "org/repo" },
      "labels": [{ "name": "good-first-issue", "color": "7057ff" }],
      "isPullRequest": false
    }
  ],
  "pagination": { "totalCount": 142, "page": 1, "perPage": 15 },
  "rateLimit": { "limit": 60, "remaining": 57, "reset": 1760000000 }
}
```

### `GET /api/github/repositories/:owner/:repo`
Fetches verified repository statistics, metadata, and README snippet.

### `GET /api/github/repositories/:owner/:repo/issues/:issueNumber`
Fetches detailed context for a specific issue.

---

## 3. AI Contribution Planning

### `POST /api/ai/contribution-plan`
Generates a structured, step-by-step contribution plan.

**Request Body:**
```json
{
  "issueTitle": "Fix memory leak in connection pool",
  "issueBody": "Detailed issue description from GitHub...",
  "repoOwner": "org",
  "repoName": "repo",
  "verifiedFiles": ["src/pool.js"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "issueSummary": "Address unbounded array growth during socket timeout cycles.",
    "problemInterpretation": "The connection pool does not remove timed-out sockets from the internal set.",
    "relevantFiles": [
      { "filePath": "src/pool.js", "reason": "Contains socket pool manager", "isVerified": false }
    ],
    "implementationSteps": [
      {
        "stepNumber": 1,
        "title": "Add timeout cleanup hook",
        "description": "Listen for socket 'timeout' event and splice from pool.",
        "safetyNotes": "Ensure active transactions are not prematurely closed."
      }
    ],
    "dependenciesAndRisks": ["Minor performance impact when scanning active pool"],
    "acceptanceCriteria": ["Timed-out connections are cleared within 100ms"],
    "testPlan": ["Add unit test with mock timed-out socket"],
    "suggestedPR": {
      "title": "fix(pool): clean up timed-out sockets from connection pool",
      "description": "## Changes\n- Removed leaked sockets..."
    }
  },
  "meta": {
    "provider": "gemini",
    "durationMs": 1420,
    "hasRepoContext": true
  }
}
```

---

## 4. Contribution Validation & PR Descriptions

### `POST /api/contributions/validate-plan`
Validates an edited plan and returns verification metrics.

### `POST /api/contributions/pr-description`
Generates a complete GitHub pull request markdown template from plan data.
