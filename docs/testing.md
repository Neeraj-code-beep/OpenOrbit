# Testing & Verification Guide

OpenOrbit employs unit, integration, and static analysis tests to maintain reliability.

## 1. Backend Testing
OpenOrbit uses the native Node.js test runner (`node:test` and `node:assert/strict`), which requires zero external heavy frameworks and executes rapidly.

### Running Backend Tests
```bash
npm test
# or inside server:
npm --prefix server test
```

### Test Suites Implemented:
1. `src/tests/health.test.js`:
   - Validates `GET /api/health` returns 200 with truthful telemetry for GitHub, AI, and MCP.
   - Validates unmapped endpoints return structured 404 JSON with error codes.
2. `src/tests/github.test.js`:
   - Tests `mapGitHubIssue` data normalization and pull-request discrimination.
   - Tests path parameter validation (preventing directory traversal / shell character injections).
   - Tests issue search query validation.
3. `src/tests/contribution.test.js`:
   - Validates parsing and schema validation of raw JSON contribution plans.
   - Verifies code fence stripping (`\`\`\`json ... \`\`\``).
   - Tests PR description markdown synthesis with verified vs suggested file badges.
   - Validates XML prompt containment escaping to prevent prompt injection.

---

## 2. Frontend Linting & Static Analysis
Frontend code is validated using **Oxlint** for sub-millisecond AST linting:

```bash
npm run lint
# or inside client:
npm --prefix client run lint
```

---

## 3. Production Compilation
Verify Vite bundle generation:

```bash
npm run build
# or inside client:
npm --prefix client run build
```
Outputs optimized JS and CSS bundles into `client/dist`.
