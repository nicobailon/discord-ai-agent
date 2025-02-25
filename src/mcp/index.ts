/**
 * MCP Module
 * Exports MCP functionality
 */

export { MCPServerRegistry } from './registry';
export { MCPServerClient } from './client';
export { MCPService } from './service';

// Initialize MCP service
import { MCPService } from './service';

/**
 * Create an MCP service instance
 * @param configJson Optional JSON string containing server configurations
 * @returns MCP service instance
 */
export function createMCPService(configJson?: string): MCPService {
  return new MCPService(configJson);
} 