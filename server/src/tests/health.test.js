import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

describe('Health Check API', () => {
  const app = createApp();

  it('GET /api/health returns 200 with structured checks', async () => {
    // Start temporary listener
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      assert.equal(res.status, 200);

      const json = await res.json();
      assert.ok(json.status);
      assert.ok(json.timestamp);
      assert.equal(json.service, 'OpenOrbit Backend API');
      assert.ok(json.checks);
      assert.ok(json.checks.github);
      assert.ok(json.checks.ai);
      assert.ok(json.checks.ai.gemini, 'checks.ai.gemini should be defined');
      assert.ok(json.checks.ai.ollama, 'checks.ai.ollama should be defined');
      assert.ok(json.checks.mcp);
      assert.ok(json.checks.pythonService);
    } finally {
      server.close();
    }
  });

  it('GET /api/v1/health returns 200 via versioned route alias', async () => {
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.ok(json.checks.ai.gemini);
      assert.ok(json.checks.ai.ollama);
    } finally {
      server.close();
    }
  });

  it('GET /api/non-existent returns 404 with structured error', async () => {
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/non-existent`);
      assert.equal(res.status, 404);

      const json = await res.json();
      assert.equal(json.success, false);
      assert.equal(json.error.code, 'NOT_FOUND');
    } finally {
      server.close();
    }
  });

  it('getGitHubAuthDiagnostic safely reports presence without disclosing secrets or falsely claiming 5,000 req/hr', async () => {
    const { getGitHubAuthDiagnostic, getEnvStatus } = await import('../config/env.js');
    const diag = getGitHubAuthDiagnostic();
    assert.equal(typeof diag.tokenPresent, 'boolean');
    assert.ok(diag.status === 'TOKEN_PRESENT_UNVERIFIED' || diag.status === 'TOKEN_NOT_CONFIGURED');
    assert.ok(typeof diag.message === 'string');
    // Ensure token value is not exposed in diagnostic
    assert.equal(diag.token, undefined);
    assert.equal(diag.value, undefined);

    const envStatus = getEnvStatus();
    assert.ok(envStatus.gitHubTokenDiagnostic);
    assert.equal(typeof envStatus.hasGitHubToken, 'boolean');
    // Ensure token value is not exposed in env status
    assert.equal(envStatus.GITHUB_TOKEN, undefined);
  });
});

