import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { env } from '../../config/env.js';
import { mcpRegistry } from './mcp.registry.js';
import { AppError } from '../../utils/app-error.js';

export class MCPClientService {
  constructor(registry = mcpRegistry) {
    this.registry = registry;
    this.client = null;
    this.transport = null;
    this.status = 'PENDING_SERVER_CONFIG';
    this.serverInfo = null;
    this.lastError = null;
    this.timeoutMs = 15000;
  }

  /**
   * Returns current honest MCP integration status
   */
  getStatus() {
    const isConfigured = Boolean(env.MCP_SERVER_COMMAND);

    return {
      status: this.status,
      enabled: env.MCP_ENABLED,
      configured: isConfigured,
      serverCommand: env.MCP_SERVER_COMMAND ? env.MCP_SERVER_COMMAND : null,
      serverInfo: this.serverInfo,
      registeredToolsCount: this.registry.listTools().length,
      lastError: this.lastError ? this.lastError.message : null,
      instructions: !isConfigured
        ? 'No external MCP server configured. To connect a live MCP server (e.g. GitHub MCP server), set MCP_ENABLED=true and MCP_SERVER_COMMAND in .env. See docs/mcp-tools.md.'
        : null,
    };
  }

  /**
   * Initializes and connects to a configured MCP server via stdio transport
   */
  async connect() {
    if (!env.MCP_ENABLED || !env.MCP_SERVER_COMMAND) {
      this.status = 'PENDING_SERVER_CONFIG';
      return false;
    }

    try {
      this.status = 'CONNECTING';

      // Security check: ensure command doesn't contain shell injection operators
      if (/[;&|`]/.test(env.MCP_SERVER_COMMAND)) {
        throw new AppError('Invalid MCP_SERVER_COMMAND: shell metacharacters not allowed', 400, 'SECURITY_VIOLATION');
      }

      this.transport = new StdioClientTransport({
        command: env.MCP_SERVER_COMMAND,
        args: env.MCP_SERVER_ARGS || [],
      });

      this.client = new Client(
        {
          name: 'PRPath-MCP-Client',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      await this.client.connect(this.transport);
      this.status = 'CONNECTED';
      this.lastError = null;

      // Discover remote tools from server
      const remoteTools = await this.client.listTools();
      if (remoteTools && remoteTools.tools) {
        for (const tool of remoteTools.tools) {
          this.registry.registerTool(tool);
        }
      }

      return true;
    } catch (err) {
      this.status = 'ERROR';
      this.lastError = err;
      console.warn('[MCP_CONNECT_ERROR] Could not connect to MCP server:', err.message);
      return false;
    }
  }

  /**
   * Invokes an MCP tool safely with argument validation and timeout
   * @param {string} name - Tool name
   * @param {Object} args - Tool parameters
   */
  async invokeTool(name, args = {}) {
    // Validate tool against registry
    this.registry.validateToolArgs(name, args);

    if (this.status !== 'CONNECTED' || !this.client) {
      throw new AppError(
        `Cannot execute MCP tool '${name}': No live MCP server is connected. Status is ${this.status}. Consult docs/mcp-tools.md for configuration.`,
        503,
        'MCP_SERVER_NOT_CONNECTED',
        { currentStatus: this.getStatus() }
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const result = await this.client.callTool(
        {
          name,
          arguments: args,
        },
        { signal: controller.signal }
      );

      return {
        tool: name,
        result,
        executedAt: new Date().toISOString(),
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new AppError(`MCP Tool '${name}' invocation timed out after ${this.timeoutMs / 1000}s`, 504, 'MCP_TIMEOUT');
      }
      if (err instanceof AppError) throw err;
      throw new AppError(`MCP tool '${name}' execution failed: ${err.message}`, 502, 'MCP_EXECUTION_ERROR');
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Gracefully close connection
   */
  async disconnect() {
    if (this.client) {
      try {
        await this.client.close();
      } catch (err) {
        // ignore close errors
      }
      this.client = null;
      this.transport = null;
      this.status = 'DISCONNECTED';
    }
  }
}

export const mcpClient = new MCPClientService();
