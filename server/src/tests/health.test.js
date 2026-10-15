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
      assert.equal(json.service, 'PRPath Backend API');
      assert.ok(json.checks);
      assert.ok(json.checks.github);
      assert.ok(json.checks.ai);
      assert.ok(json.checks.mcp);
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
});
