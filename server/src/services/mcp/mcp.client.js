import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { env } from '../../config/env.js';
import { mcpRegistry } from './mcp.registry.js';
import { AppError } from '../../utils/app-error.js';
import { verifyActionApprovalToken } from '../../utils/crypto.utils.js';

export class MCPClientService {
  constructor(registry = mcpRegistry) {
    this.registry = registry;
    this.client = null;
    this.transport = null;
    this.discoveredTools = new Map();
    this.status = env.MCP_ENABLED
      ? (env.MCP_SERVER_COMMAND ? 'NOT_INITIALIZED' : 'PENDING_SERVER_CONFIG')
      : 'DISABLED';
    this.serverInfo = null;
    this.lastError = null;
    this.timeoutMs = 15000;
  }

  /**
   * Whether the client is connected to a live MCP server
   */
  isConnected() {
    return Boolean(this.client && (this.status === 'CONNECTED' || this.status === 'TOOLS_AVAILABLE'));
  }

  /**
   * Check whether a specific tool is available
   */
  hasTool(name) {
    return this.discoveredTools.has(name) || this.registry.hasRemoteTool(name);
  }

  /**
   * Returns current honest MCP integration status
   */
  getStatus() {
    const isConfigured = Boolean(env.MCP_SERVER_COMMAND);
    let currentStatus = this.status;

    if (!this.isConnected()) {
      if (!env.MCP_ENABLED) {
        currentStatus = 'DISABLED';
      } else if (!isConfigured) {
        currentStatus = 'PENDING_SERVER_CONFIG';
      }
    }

    return {
      status: currentStatus,
      enabled: env.MCP_ENABLED,
      configured: isConfigured,
      connected: this.isConnected(),
      serverCommand: env.MCP_SERVER_COMMAND ? env.MCP_SERVER_COMMAND : null,
      serverInfo: this.serverInfo,
      discoveredToolsCount: this.discoveredTools.size,
      discoveredTools: Array.from(this.discoveredTools.values()).map((tool) => ({
        name: tool.name,
        description: tool.description || '',
      })),
      lastError: this.lastError ? this.lastError.message : null,
      instructions: !env.MCP_ENABLED
        ? 'MCP integration is disabled. Set MCP_ENABLED=true in .env to enable.'
        : !isConfigured
          ? 'No external MCP server configured. To connect a live MCP server (e.g. GitHub MCP server), set MCP_ENABLED=true and MCP_SERVER_COMMAND in .env. See docs/mcp-tools.md.'
          : null,
    };
  }

  /**
   * Initializes and connects to a configured MCP server via stdio transport
   */
  async connect() {
    // Prevent duplicate initialization if already connected or currently connecting
    if (this.isConnected() || this.status === 'CONNECTING') {
      return true;
    }

    if (!env.MCP_ENABLED) {
      this.status = 'DISABLED';
      return false;
    }

    if (!env.MCP_SERVER_COMMAND) {
      this.status = 'PENDING_SERVER_CONFIG';
      return false;
    }

    try {
      this.status = 'CONNECTING';

      // Security check: ensure command doesn't contain shell injection operators
      if (/[;&|`]/.test(env.MCP_SERVER_COMMAND)) {
        throw new AppError('Invalid MCP_SERVER_COMMAND: shell metacharacters not allowed', 400, 'SECURITY_VIOLATION');
      }

      // Windows-safe command adaptation for batch/cmd wrappers like npx
      let command = env.MCP_SERVER_COMMAND;
      let args = Array.isArray(env.MCP_SERVER_ARGS) ? [...env.MCP_SERVER_ARGS] : [];

      if (process.platform === 'win32' && (command === 'npx' || command.endsWith('.cmd') || command.endsWith('.bat'))) {
        args = ['/c', command, ...args];
        command = 'cmd.exe';
      }

      // Pass safe environment variables to child process including GitHub token
      const serverEnv = {
        ...process.env,
        GITHUB_PERSONAL_ACCESS_TOKEN: env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_ACCESS_TOKEN || '',
        GITHUB_TOKEN: env.GITHUB_TOKEN || process.env.GITHUB_TOKEN || '',
      };

      this.transport = new StdioClientTransport({
        command,
        args,
        env: serverEnv,
      });

      this.client = new Client(
        {
          name: 'OpenOrbit-MCP-Client',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      // Connection with 10-second timeout to avoid hanging server startup
      const connectPromise = this.client.connect(this.transport);
      await Promise.race([
        connectPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('MCP server connection timed out after 10s')), 10000)
        ),
      ]);

      this.status = 'CONNECTED';
      this.lastError = null;
      this.serverInfo = (typeof this.client.getServerVersion === 'function' && this.client.getServerVersion()) || {
        name: env.MCP_SERVER_COMMAND,
        version: '1.0.0',
      };

      // Discover remote tools from server
      this.discoveredTools.clear();
      this.registry.clearRemoteTools();

      const remoteTools = await this.client.listTools();
      if (remoteTools && Array.isArray(remoteTools.tools)) {
        for (const tool of remoteTools.tools) {
          this.discoveredTools.set(tool.name, tool);
          this.registry.registerRemoteTool(tool);
        }
      }

      if (this.discoveredTools.size > 0) {
        this.status = 'TOOLS_AVAILABLE';
      }

      console.log(`🔌 [MCP] Successfully connected to server '${command}'. Discovered ${this.discoveredTools.size} tools.`);
      return true;
    } catch (err) {
      this.status = 'ERROR';
      this.lastError = err;
      console.warn('[MCP_CONNECT_ERROR] Could not connect to MCP server:', err.message);

      if (this.transport) {
        try {
          await this.transport.close();
        } catch (_) {}
        this.transport = null;
      }
      this.client = null;
      return false;
    }
  }

  /**
   * Invokes an MCP tool safely with argument validation and timeout
   * @param {string} name - Tool name
   * @param {Object} args - Tool parameters
   * @param {Object} [options={}]
   * @param {boolean} [options.userApproval=false] - Explicit user confirmation for consequential actions
   */
  async invokeTool(name, args = {}, options = {}) {
    // Validate tool against registry
    this.registry.validateToolArgs(name, args);

    // Security Gate: require explicit user approval for consequential actions
    const tool = this.registry.getTool(name);
    if (tool?.isConsequential) {
      if (!options.userApproval && !options.approvalToken) {
        throw new AppError(
          `Tool action '${name}' is consequential (mutates repository/issue state) and requires explicit user confirmation.`,
          403,
          'ACTION_APPROVAL_REQUIRED',
          { tool: name, requiresApproval: true }
        );
      }

      // If an approval token is provided, cryptographically verify binding
      if (options.approvalToken) {
        const secretKey = env.JWT_SECRET || env.GITHUB_ENCRYPTION_KEY;
        const verification = verifyActionApprovalToken(
          options.approvalToken,
          { userId: options.userId, tool: name, args },
          secretKey
        );
        if (!verification.valid) {
          throw new AppError(
            `Consequential action approval verification failed: ${verification.error}`,
            403,
            'ACTION_APPROVAL_INVALID',
            { tool: name, reason: verification.error }
          );
        }
      }
    }

    if (!this.isConnected() || !this.client) {
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
        undefined,
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
      } catch (_) {}
      this.client = null;
    }
    if (this.transport) {
      try {
        await this.transport.close();
      } catch (_) {}
      this.transport = null;
    }
    this.discoveredTools.clear();
    this.registry.clearRemoteTools();
    this.status = env.MCP_ENABLED ? 'DISCONNECTED' : 'DISABLED';
  }
}

export const mcpClient = new MCPClientService();
