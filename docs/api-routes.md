# API Routes Specification

All API routes are prefixed under `/api`. Authentication is via HTTP-only cookie (`openorbit_token`).

---

## 1. Health & Telemetry

### `GET /api/health`
Performs live health checks across all backend dependencies (GitHub rate limits, AI providers, Ollama reachability, MCP status, Python AI service).

**Authentication:** None

**Response (200 OK):**
```json
{
  "status": "HEALTHY",
  "timestamp": "2026-10-15T10:00:00.000Z",
  "uptimeSeconds": 142,
  "service": "OpenOrbit Backend API",
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
    },
    "pythonService": {
      "status": "STANDBY",
      "url": "http://127.0.0.1:8000",
      "message": "Python AI service is currently offline or standby (owned by teammates)."
    }
  }
}
```

---

## 2. Authentication

All authentication endpoints are mounted under `/api/v1/auth` (alias `/api/auth`). Session tokens are transmitted via secure HTTP-only cookies (`openorbit_token`).

### `POST /api/v1/auth/register`
Creates a new user account with bcrypt password hashing and issues a session cookie.

**Authentication:** None

**Request Body:**
```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "SecurePassword123!"
}
```

**Validation Rules:**
- `name`: 2–60 characters
- `email`: valid email format, normalized to lowercase
- `password`: ≥ 8 characters, must contain ≥ 1 letter and ≥ 1 digit

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "661000000000000000000001",
      "name": "Ada Lovelace",
      "email": "ada@example.com",
      "createdAt": "2026-10-15T12:00:00.000Z",
      "updatedAt": "2026-10-15T12:00:00.000Z"
    }
  }
}
```
*Sets `Set-Cookie: openorbit_token=<jwt>; Path=/; HttpOnly; SameSite=Lax`*

**Error Codes:** `VALIDATION_ERROR` (400), `EMAIL_ALREADY_EXISTS` (409)

---

### `POST /api/v1/auth/login`
Verifies credentials and issues a session cookie.

**Authentication:** None

**Request Body:**
```json
{
  "email": "ada@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "661000000000000000000001",
      "name": "Ada Lovelace",
      "email": "ada@example.com",
      "createdAt": "2026-10-15T12:00:00.000Z",
      "updatedAt": "2026-10-15T12:00:00.000Z"
    }
  }
}
```
*Sets `Set-Cookie: openorbit_token=<jwt>`*

**Error Codes:** `VALIDATION_ERROR` (400), `INVALID_CREDENTIALS` (401)

---

### `GET /api/v1/auth/me` *(Protected)*
Returns the authenticated user's profile.

**Authentication:** Required (cookie or Bearer token)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "661000000000000000000001",
      "name": "Ada Lovelace",
      "email": "ada@example.com",
      "createdAt": "2026-10-15T12:00:00.000Z",
      "updatedAt": "2026-10-15T12:00:00.000Z"
    }
  }
}
```

**Error Codes:** `UNAUTHORIZED` (401), `TOKEN_EXPIRED` (401), `USER_NOT_FOUND` (401)

---

### `POST /api/v1/auth/logout`
Clears the `openorbit_token` authentication cookie.

**Authentication:** None (idempotent)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### `POST /api/v1/auth/reauth` *(Protected)*
Verifies the user's local password and issues a **single-use, 5-minute reauthentication ticket** required before sensitive operations (e.g., linking a GitHub identity).

**Authentication:** Required

**Request Body:**
```json
{
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Reauthentication successful. Use ticket within 5 minutes to link external identity.",
  "data": {
    "ticket": "a1b2c3d4e5f6...",
    "expiresAt": "2026-10-15T12:05:00.000Z"
  }
}
```

**Error Codes:** `VALIDATION_ERROR` (400), `NO_LOCAL_PASSWORD` (400), `UNAUTHORIZED` (401), `INVALID_CREDENTIALS` (401), `USER_NOT_FOUND` (404)

---

### `GET /api/v1/auth/github` *(Redirect)*
Initiates the GitHub App authorization code flow. Redirects the browser to GitHub's authorization URL.

**Authentication:** Required only when `link=true`

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `link` | `"true"` | No | Set to `"true"` to link GitHub to existing account (requires active session) |
| `ticket` | string | Only with `link` | Reauthentication ticket from `POST /api/v1/auth/reauth` |
| `redirect_to` | string | No | Frontend URL to redirect after completion (default: `/`) |

**Behavior:**
- Sets `openorbit_oauth_state` HTTP-only cookie (10 min TTL)
- Redirects to `https://github.com/login/oauth/authorize?...`

**Frontend Integration:**
```javascript
// Sign in with GitHub (no existing session)
window.location.href = '/api/v1/auth/github';

// Link GitHub to existing account
window.location.href = `/api/v1/auth/github?link=true&ticket=${ticket}`;
```

---

### `GET /api/v1/auth/github/callback` *(Redirect)*
Handles GitHub's OAuth redirect, exchanges the authorization code, and either links the GitHub identity or signs in/registers the user.

**Authentication:** Validated via OAuth state cookie

**Query Parameters (set by GitHub):**
| Parameter | Type | Description |
|---|---|---|
| `code` | string | Authorization code from GitHub |
| `state` | string | CSRF protection state |
| `error` | string | Error code if user denied authorization |
| `error_description` | string | Error message from GitHub |

**Success Redirect (link flow):**
```
{CLIENT_ORIGIN}{redirect_to}?github_linked=true
```

**Success Redirect (auth flow):**
```
{CLIENT_ORIGIN}{redirect_to}?auth_success=registered  // or auth_success=logged_in
```

**Error Redirect:**
```
{CLIENT_ORIGIN}?auth_error=ERROR_CODE&message=Human+readable+description
```

**Error Codes in redirect:** `ACCESS_DENIED`, `PROVIDER_ERROR`, `INVALID_STATE`, `TOKEN_EXCHANGE_FAILED`, `PROFILE_FETCH_FAILED`, `SESSION_MISMATCH`, `UNAUTHORIZED`, `AUTH_PROCESSING_FAILED`

---

## 3. GitHub Operations

All GitHub endpoints accept optional authentication. Authenticated users benefit from higher GitHub API rate limits (5,000/hour vs 60/hour).

### `GET /api/github/issues`
Searches real GitHub issues based on query keywords, language, and labels.

**Authentication:** Optional (higher rate limits when authenticated)

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `query` | string | `""` | Keyword search |
| `label` | string | `"good-first-issue"` | Label filter |
| `language` | string | `""` | Programming language |
| `page` | integer | `1` | Page number |
| `per_page` | integer | `15` | Page size (max: 100) |

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
      "updatedAt": "2026-10-15T00:00:00Z",
      "author": "octocat",
      "authorAvatar": "https://avatars.githubusercontent.com/...",
      "commentsCount": 4,
      "repository": { "owner": "org", "name": "repo", "fullName": "org/repo" },
      "labels": [{ "name": "good-first-issue", "color": "7057ff", "description": "..." }],
      "isPullRequest": false
    }
  ],
  "pagination": { "totalCount": 142, "page": 1, "perPage": 15 },
  "rateLimit": { "limit": 60, "remaining": 57, "reset": 1760000000 }
}
```

---

### `GET /api/github/repositories/:owner/:repo`
Fetches verified repository metadata and a README snippet (first 4000 chars).

**Authentication:** Optional

**Path Parameters:** `owner` (string), `repo` (string)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 10270250,
    "name": "react",
    "fullName": "facebook/react",
    "owner": "facebook",
    "description": "The library for web and native user interfaces",
    "htmlUrl": "https://github.com/facebook/react",
    "starsCount": 230000,
    "forksCount": 47000,
    "openIssuesCount": 900,
    "language": "JavaScript",
    "license": "MIT",
    "defaultBranch": "main",
    "isArchived": false,
    "updatedAt": "2026-10-15T00:00:00Z",
    "readmeSnippet": "# React\nA JavaScript library for building user interfaces..."
  },
  "rateLimit": { "limit": 60, "remaining": 56, "reset": 1760000000 }
}
```

---

### `GET /api/github/repositories/:owner/:repo/issues/:issueNumber`
Fetches detailed context for a specific issue. Returns 400 if the item is a pull request.

**Authentication:** Optional

**Path Parameters:** `owner`, `repo`, `issueNumber`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1928374,
    "number": 42,
    "title": "Fix memory leak in socket connection pool",
    "body": "Full issue description...",
    "state": "open",
    "htmlUrl": "https://github.com/org/repo/issues/42",
    "createdAt": "2026-10-15T00:00:00Z",
    "updatedAt": "2026-10-15T00:00:00Z",
    "author": "octocat",
    "authorAvatar": "https://avatars.githubusercontent.com/...",
    "commentsCount": 4,
    "repository": { "owner": "org", "name": "repo", "fullName": "org/repo" },
    "labels": [{ "name": "good-first-issue", "color": "7057ff" }],
    "isPullRequest": false
  },
  "rateLimit": { "limit": 60, "remaining": 55, "reset": 1760000000 }
}
```

**Error Codes:** `NOT_AN_ISSUE` (400)

---

### `GET /api/github/repositories/:owner/:repo/pulls`
Fetches pull requests for a repository.

**Authentication:** Optional

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `state` | `"open"` \| `"closed"` \| `"all"` | `"open"` | Filter by PR state |
| `page` | integer | `1` | Page number |
| `per_page` | integer | `15` | Page size |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 556677,
      "number": 101,
      "title": "Add TypeScript support",
      "body": "PR description...",
      "state": "open",
      "htmlUrl": "https://github.com/org/repo/pull/101",
      "createdAt": "2026-10-14T00:00:00Z",
      "updatedAt": "2026-10-15T00:00:00Z",
      "closedAt": null,
      "mergedAt": null,
      "isDraft": false,
      "author": "contributor",
      "authorAvatar": "https://avatars.githubusercontent.com/...",
      "baseBranch": "main",
      "headBranch": "feat/typescript",
      "labels": [{ "name": "enhancement", "color": "a2eeef" }]
    }
  ],
  "pagination": { "page": 1, "perPage": 15 },
  "rateLimit": { "limit": 60, "remaining": 54, "reset": 1760000000 }
}
```

---

### `GET /api/github/repositories/:owner/:repo/commits`
Fetches recent commits for a repository.

**Authentication:** Optional

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `sha` | string | — | Branch name or commit SHA to start from |
| `page` | integer | `1` | Page number |
| `per_page` | integer | `15` | Page size |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "sha": "abc1234567890def",
      "shortSha": "abc1234",
      "message": "fix: resolve memory leak in connection pool",
      "authorName": "Ada Lovelace",
      "authorEmail": "ada@example.com",
      "date": "2026-10-15T08:00:00Z",
      "authorAvatar": "https://avatars.githubusercontent.com/...",
      "authorLogin": "adalovelace",
      "htmlUrl": "https://github.com/org/repo/commit/abc1234567890def"
    }
  ],
  "pagination": { "page": 1, "perPage": 15 },
  "rateLimit": { "limit": 60, "remaining": 53, "reset": 1760000000 }
}
```

---

### `GET /api/github/users/:username/activity`
Fetches public activity events for a GitHub user.

**Authentication:** Optional

**Path Parameters:** `username` (string, 1–39 chars, alphanumeric/hyphens)

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `per_page` | integer | `15` | Page size |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "12345678",
      "type": "PushEvent",
      "actor": "adalovelace",
      "actorAvatar": "https://avatars.githubusercontent.com/...",
      "repo": "org/repo",
      "createdAt": "2026-10-15T08:00:00Z",
      "action": null
    }
  ],
  "pagination": { "page": 1, "perPage": 15 },
  "rateLimit": { "limit": 60, "remaining": 52, "reset": 1760000000 }
}
```

---

### `GET /api/github/user/repos` *(Protected)*
Fetches repositories of the currently authenticated user (requires connected GitHub account).

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `1` | Page number |
| `per_page` | integer | `15` | Page size |
| `sort` | `"updated"` \| `"created"` \| `"pushed"` \| `"full_name"` | `"updated"` | Sort order |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 10270250,
      "name": "my-project",
      "fullName": "adalovelace/my-project",
      "owner": "adalovelace",
      "description": "My awesome project",
      "htmlUrl": "https://github.com/adalovelace/my-project",
      "starsCount": 12,
      "forksCount": 3,
      "openIssuesCount": 2,
      "language": "TypeScript",
      "license": "MIT",
      "defaultBranch": "main",
      "isArchived": false,
      "updatedAt": "2026-10-15T00:00:00Z"
    }
  ],
  "pagination": { "page": 1, "perPage": 15 },
  "rateLimit": { "limit": 5000, "remaining": 4998, "reset": 1760000000 }
}
```

**Error Codes:** `UNAUTHORIZED` (401), `GITHUB_NOT_CONNECTED` (400)

---

## 4. Saved Issues

All saved-issue endpoints require authentication. Issues are scoped to the authenticated user.

### `POST /api/v1/saved-issues` *(Protected)*
Saves an open-source GitHub issue to the user's collection. Uses upsert to prevent duplicates.

**Authentication:** Required

**Request Body:**
```json
{
  "issueId": 987654,
  "number": 42,
  "title": "Fix hydration error in SSR",
  "bodySnippet": "Detailed description of the issue (max 1000 chars)",
  "htmlUrl": "https://github.com/facebook/react/issues/42",
  "state": "open",
  "repository": {
    "owner": "facebook",
    "name": "react",
    "fullName": "facebook/react"
  },
  "labels": [{ "name": "good-first-issue", "color": "7057ff" }],
  "notes": "Look into component unmounting logic (max 2000 chars)"
}
```

**Required Fields:** `issueId`, `number`, `title`, `htmlUrl`, `repository.owner`, `repository.name`

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Issue saved successfully",
  "data": {
    "id": "662000000000000000000001",
    "userId": "661000000000000000000001",
    "issueId": 987654,
    "number": 42,
    "title": "Fix hydration error in SSR",
    "bodySnippet": "Detailed description of the issue",
    "htmlUrl": "https://github.com/facebook/react/issues/42",
    "state": "open",
    "repository": { "owner": "facebook", "name": "react", "fullName": "facebook/react" },
    "labels": [{ "name": "good-first-issue", "color": "7057ff" }],
    "notes": "Look into component unmounting logic",
    "status": "saved",
    "createdAt": "2026-10-15T12:00:00.000Z",
    "updatedAt": "2026-10-15T12:00:00.000Z"
  }
}
```

**Error Codes:** `VALIDATION_ERROR` (400), `ISSUE_ALREADY_SAVED` (409), `UNAUTHORIZED` (401)

---

### `GET /api/v1/saved-issues` *(Protected)*
Lists all saved issues for the authenticated user with optional filters and pagination.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `status` | `"saved"` \| `"in_progress"` \| `"completed"` \| `"dismissed"` | — | Filter by status |
| `repo` | string | — | Filter by `repository.fullName` (e.g., `"facebook/react"`) |
| `page` | integer | `1` | Page number |
| `per_page` | integer | `20` | Page size (max: 100) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [ "/* array of saved issue objects */" ],
  "pagination": {
    "totalCount": 42,
    "page": 1,
    "perPage": 20,
    "totalPages": 3
  }
}
```

---

### `GET /api/v1/saved-issues/:id` *(Protected)*
Fetches a single saved issue by its MongoDB ID. Only returns issues owned by the authenticated user.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": { "/* saved issue object */" }
}
```

**Error Codes:** `NOT_FOUND` (404), `UNAUTHORIZED` (401)

---

### `PATCH /api/v1/saved-issues/:id` *(Protected)*
Updates notes or tracking status for a saved issue.

**Authentication:** Required

**Request Body (all optional, ≥ 1 required):**
```json
{
  "notes": "Updated progress notes here",
  "status": "in_progress"
}
```

**Valid `status` values:** `"saved"`, `"in_progress"`, `"completed"`, `"dismissed"`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Saved issue updated successfully",
  "data": { "/* updated saved issue object */" }
}
```

**Error Codes:** `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `UNAUTHORIZED` (401)

---

### `DELETE /api/v1/saved-issues/:id` *(Protected)*
Removes an issue from the user's saved collection.

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Saved issue removed successfully"
}
```

**Error Codes:** `NOT_FOUND` (404), `UNAUTHORIZED` (401)

---

## 5. Issue Recommendations

### `GET /api/v1/recommendations/issues` *(Protected)*
Suggests beginner-friendly GitHub issues personalized to the user's saved issues. Derives language preferences from saved issue labels and excludes repositories the user already tracks.

**Authentication:** Required

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `language` | string | *(derived)* | Override language preference |
| `label` | string | `"good-first-issue"` | Label filter |
| `page` | integer | `1` | Page number |
| `per_page` | integer | `15` | Page size (max: 50) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 2002,
      "number": 20,
      "title": "Improve logging utility",
      "body": "...",
      "state": "open",
      "htmlUrl": "https://github.com/nodejs/node/issues/20",
      "createdAt": "2026-10-14T00:00:00Z",
      "author": "contributor",
      "repository": { "owner": "nodejs", "name": "node", "fullName": "nodejs/node" },
      "labels": [{ "name": "good-first-issue", "color": "7057ff" }],
      "isPullRequest": false
    }
  ],
  "pagination": { "totalCount": 142, "page": 1, "perPage": 15 },
  "rateLimit": { "limit": 5000, "remaining": 4997, "reset": 1760000000 },
  "meta": {
    "derivedLanguage": "javascript",
    "derivedLanguages": ["javascript", "typescript"],
    "excludedRepos": ["facebook/react", "vercel/next.js"]
  }
}
```

---

## 6. AI Contribution Planning

### `POST /api/ai/contribution-plan`
Generates a structured, step-by-step AI contribution plan for a GitHub issue. Fetches repository README for context.

**Authentication:** None (rate limits apply)

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
    "problemInterpretation": "The connection pool does not remove timed-out sockets.",
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

## 7. Contribution Validation & PR Descriptions

### `POST /api/contributions/validate-plan`
Validates an edited contribution plan and returns verification metrics.

**Authentication:** None

### `POST /api/contributions/pr-description`
Generates a complete GitHub pull request markdown template from plan data.

**Authentication:** None

**Request Body:**
```json
{
  "plan": {
    "issueSummary": "Fix memory leak in socket connection pool",
    "problemInterpretation": "The connection pool does not remove timed-out sockets.",
    "implementationSteps": [
      {
        "stepNumber": 1,
        "title": "Add timeout cleanup hook",
        "description": "Listen for socket timeout event and splice from pool."
      }
    ],
    "acceptanceCriteria": ["Sockets are cleanly disposed."],
    "testPlan": ["Add unit test with mock socket."]
  },
  "issueNumber": 7510,
  "issueTitle": "Fix memory leak in socket connection pool",
  "repoOwner": "expressjs",
  "repoName": "express"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "title": "fix: resolve Fix memory leak in socket connection pool",
    "body": "## Summary\nCloses #7510.\nFix memory leak in socket connection pool\n\n### Problem Interpretation\nThe connection pool does not remove timed-out sockets.\n\n### Changes Implemented\n1. **Add timeout cleanup hook**: Listen for socket timeout event and splice from pool.\n\n### Modified Files\n- See Git diff\n\n### Testing & Verification\n- [ ] Add unit test with mock socket.\n\n### Acceptance Criteria\n- [ ] Sockets are cleanly disposed.\n\n---\n*Generated by [OpenOrbit](https://github.com/openorbit) — AI-assisted open-source contribution workflow.*\n*Note: Always review changes carefully before submitting.*"
  }
}
```

---

## 8. MCP Status

### `GET /api/mcp/status`
Returns the current Model Context Protocol (MCP) orchestration status.

**Authentication:** None

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "PENDING_SERVER_CONFIG",
    "enabled": false,
    "configured": false,
    "serverCommand": null,
    "serverInfo": null,
    "registeredToolsCount": 5,
    "lastError": null,
    "instructions": "No external MCP server configured. To connect a live MCP server (e.g. GitHub MCP server), set MCP_ENABLED=true and MCP_SERVER_COMMAND in .env. See docs/mcp-tools.md."
  }
}
```

---

## Error Response Format

All errors follow a consistent structure:

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error description",
    "code": "MACHINE_READABLE_CODE",
    "statusCode": 400,
    "details": ["Optional array of specific validation errors"]
  }
}
```

**Common Error Codes:**
| Code | HTTP Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | No valid session or missing authentication |
| `TOKEN_EXPIRED` | 401 | JWT session has expired |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password combination |
| `VALIDATION_ERROR` | 400 | Invalid request payload |
| `NOT_FOUND` | 404 | Resource not found |
| `EMAIL_ALREADY_EXISTS` | 409 | Duplicate registration attempt |
| `ISSUE_ALREADY_SAVED` | 409 | Issue already in user's saved collection |
| `GITHUB_NOT_CONNECTED` | 400 | User has no linked GitHub account |
| `REAUTH_REQUIRED` | 403 | Reauthentication ticket needed |
| `SESSION_MISMATCH` | — | Session user ≠ linking transaction user |
| `ACTION_APPROVAL_REQUIRED` | 403 | MCP consequential action needs user approval |


