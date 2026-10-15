import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { mcpClient } from './services/mcp/mcp.client.js';

const app = createApp();
let server;

async function startServer() {
  try {
    // Attempt database connection before accepting requests
    await connectDB();
  } catch (dbErr) {
    console.warn(`⚠️ [Server] Starting with degraded database state. Auth endpoints will fail until MongoDB is available.`);
    if (env.NODE_ENV === 'production') {
      console.error('FATAL: MongoDB is strictly required in production.');
      process.exit(1);
    }
  }

  server = app.listen(env.PORT, '0.0.0.0', async () => {
    console.log(`\n========================================`);
    console.log(`🚀 OpenOrbit Backend Server Active`);
    console.log(`📡 URL: http://0.0.0.0:${env.PORT} (http://localhost:${env.PORT})`);
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
}

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  await mcpClient.disconnect();
  await disconnectDB();
  if (server) {
    server.close(() => {
      console.log('OpenOrbit server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();

export { server, app };
