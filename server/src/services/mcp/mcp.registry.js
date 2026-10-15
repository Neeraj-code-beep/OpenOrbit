import { GITHUB_MCP_TOOLS } from './tools/github.tools.js';
import { AppError } from '../../utils/app-error.js';

/**
 * Registry managing MCP tool specifications and validating inputs against JSON schemas
 */
export class MCPRegistry {
  constructor() {
    this.localTools = new Map();
    this.remoteTools = new Map();
    // Register standard default GitHub tools as reference specifications
    for (const tool of GITHUB_MCP_TOOLS) {
      this.localTools.set(tool.name, tool);
    }
  }

  /**
   * Register a remotely discovered tool specification from an active MCP server
   */
  registerRemoteTool(toolDef) {
    if (!toolDef || !toolDef.name) {
      throw new AppError('Invalid MCP tool definition: missing name', 400, 'MCP_INVALID_TOOL_DEF');
    }
    this.remoteTools.set(toolDef.name, toolDef);
  }

  /**
   * Backwards-compatible alias for registering a tool
   */
  registerTool(toolDef) {
    this.registerRemoteTool(toolDef);
  }

  /**
   * Clear all remotely discovered tools
   */
  clearRemoteTools() {
    this.remoteTools.clear();
  }

  /**
   * Returns all discovered remote tools
   */
  listRemoteTools() {
    return Array.from(this.remoteTools.values());
  }

  /**
   * Returns standard reference tools
   */
  listLocalTools() {
    return Array.from(this.localTools.values());
  }

  /**
   * Returns active tools (remote tools if connected, otherwise local fallback specifications)
   */
  listTools() {
    return this.remoteTools.size > 0
      ? Array.from(this.remoteTools.values())
      : Array.from(this.localTools.values());
  }

  /**
   * Gets a tool by name, checking remote tools first then local reference definitions
   */
  getTool(name) {
    return this.remoteTools.get(name) || this.localTools.get(name);
  }

  /**
   * Checks if a tool was discovered remotely
   */
  hasRemoteTool(name) {
    return this.remoteTools.has(name);
  }

  /**
   * Validates tool invocation arguments against the tool's inputSchema
   */
  validateToolArgs(name, args = {}) {
    const tool = this.getTool(name);
    if (!tool) {
      throw new AppError(`MCP Tool '${name}' not found in registry`, 404, 'MCP_TOOL_NOT_FOUND');
    }

    const schema = tool.inputSchema || {};
    const required = schema.required || [];

    for (const reqField of required) {
      if (args[reqField] === undefined || args[reqField] === null || args[reqField] === '') {
        throw new AppError(
          `Missing required argument '${reqField}' for MCP tool '${name}'`,
          400,
          'MCP_VALIDATION_ERROR'
        );
      }
    }

    return true;
  }
}

export const mcpRegistry = new MCPRegistry();
