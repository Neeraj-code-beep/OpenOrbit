import { GITHUB_MCP_TOOLS } from './tools/github.tools.js';
import { AppError } from '../../utils/app-error.js';

/**
 * Registry managing MCP tool specifications and validating inputs against JSON schemas
 */
export class MCPRegistry {
  constructor() {
    this.tools = new Map();
    // Register standard default GitHub tools
    for (const tool of GITHUB_MCP_TOOLS) {
      this.tools.set(tool.name, tool);
    }
  }

  /**
   * Register a new tool specification
   */
  registerTool(toolDef) {
    if (!toolDef || !toolDef.name) {
      throw new AppError('Invalid MCP tool definition: missing name', 400, 'MCP_INVALID_TOOL_DEF');
    }
    this.tools.set(toolDef.name, toolDef);
  }

  /**
   * Returns all registered tools
   */
  listTools() {
    return Array.from(this.tools.values());
  }

  /**
   * Gets a single tool by name
   */
  getTool(name) {
    return this.tools.get(name);
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
