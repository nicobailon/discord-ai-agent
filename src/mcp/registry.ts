/**
 * MCP Registry
 * Manages the configuration and access to MCP servers
 */

import { MCPServerConfig, MCPRegistry } from '../types/mcp';

/**
 * Default MCP servers configuration
 * These are the built-in MCP servers that are always available
 */
const DEFAULT_MCP_SERVERS: MCPServerConfig[] = [
  // Add any default MCP servers here if needed
];

/**
 * MCP Registry implementation
 * Manages the configuration and access to MCP servers
 */
export class MCPServerRegistry implements MCPRegistry {
  servers: MCPServerConfig[] = [];

  /**
   * Initialize the MCP registry
   * @param configJson Optional JSON string containing server configurations
   */
  constructor(configJson?: string) {
    // Start with default servers
    this.servers = [...DEFAULT_MCP_SERVERS];

    // Add servers from configuration if provided
    if (configJson) {
      try {
        const configServers = JSON.parse(configJson) as MCPServerConfig[];
        
        // Validate and add each server
        configServers.forEach(server => {
          if (this.isValidServerConfig(server)) {
            // Check if server with this ID already exists
            const existingIndex = this.servers.findIndex(s => s.id === server.id);
            if (existingIndex >= 0) {
              // Update existing server
              this.servers[existingIndex] = server;
            } else {
              // Add new server
              this.servers.push(server);
            }
          } else {
            console.error(`Invalid MCP server configuration: ${JSON.stringify(server)}`);
          }
        });
      } catch (error) {
        console.error('Error parsing MCP server configuration:', error);
      }
    }
  }

  /**
   * Validate a server configuration
   * @param config Server configuration to validate
   * @returns Whether the configuration is valid
   */
  private isValidServerConfig(config: MCPServerConfig): boolean {
    return !!(
      config &&
      typeof config.id === 'string' && 
      config.id.trim() !== '' &&
      typeof config.name === 'string' && 
      config.name.trim() !== '' &&
      typeof config.url === 'string' && 
      config.url.trim() !== '' &&
      typeof config.isEnabled === 'boolean'
    );
  }

  /**
   * Get a server by ID
   * @param id Server ID
   * @returns Server configuration or undefined if not found
   */
  getServer(id: string): MCPServerConfig | undefined {
    return this.servers.find(server => server.id === id);
  }

  /**
   * Get all servers
   * @returns All server configurations
   */
  getAllServers(): MCPServerConfig[] {
    return [...this.servers];
  }

  /**
   * Get all enabled servers
   * @returns All enabled server configurations
   */
  getEnabledServers(): MCPServerConfig[] {
    return this.servers.filter(server => server.isEnabled);
  }

  /**
   * Add a new server
   * @param server Server configuration
   * @returns Whether the server was added successfully
   */
  addServer(server: MCPServerConfig): boolean {
    if (!this.isValidServerConfig(server)) {
      return false;
    }

    // Check if server with this ID already exists
    const existingIndex = this.servers.findIndex(s => s.id === server.id);
    if (existingIndex >= 0) {
      // Update existing server
      this.servers[existingIndex] = server;
    } else {
      // Add new server
      this.servers.push(server);
    }

    return true;
  }

  /**
   * Remove a server by ID
   * @param id Server ID
   * @returns Whether the server was removed
   */
  removeServer(id: string): boolean {
    const initialLength = this.servers.length;
    this.servers = this.servers.filter(server => server.id !== id);
    return this.servers.length < initialLength;
  }

  /**
   * Enable a server by ID
   * @param id Server ID
   * @returns Whether the server was enabled
   */
  enableServer(id: string): boolean {
    const server = this.getServer(id);
    if (server) {
      server.isEnabled = true;
      return true;
    }
    return false;
  }

  /**
   * Disable a server by ID
   * @param id Server ID
   * @returns Whether the server was disabled
   */
  disableServer(id: string): boolean {
    const server = this.getServer(id);
    if (server) {
      server.isEnabled = false;
      return true;
    }
    return false;
  }
} 