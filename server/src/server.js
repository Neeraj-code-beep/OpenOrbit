import { createApp } from './app.js';
import { env } from './config/env.js';
import { mcpClient } from './services/mcp/mcp.client.js';

const app = createApp();

const server = app.listen(env.PORT, async () => {
  console.log(`\n========================================`);
  console.log(`🚀 PRPath Backend Server Active`);
  console.log(`📡 URL: http://localhost:${env.PORT}`);
  console.log(`🩺 Health: http://localhost:${env.PORT}/api/health`);
  console.log(`🤖 AI Provider: ${env.AI_PROVIDER}`);
  console.log(`🔑 GitHub Token: ${env.GITHUB_TOKEN ? 'Configured (5,000 req/hr)' : 'Unauthenticated (60 req/hr)'}`);
  console.log(`🛠️  MCP Status: ${env.MCP_ENABLED ? 'Enabled' : 'Disabled / Standby'}`);
  console.log(`========================================\n`);

  // If MCP is enabled, attempt initialization
  if (env.MCP_ENABLED) {
    console.log('[MCP] Attempting connection to configured MCP server...');
    await mcpClient.connect();
  }
});

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  await mcpClient.disconnect();
  server.close(() => {
    console.log('PRPath server closed.');
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export { server, app };
