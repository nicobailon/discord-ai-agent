/**
 * MCP Client
 * Handles communication with MCP servers
 */

import { MCPClient, MCPRequest, MCPResponse, MCPRegistry, MCPServerConfig } from '../types/mcp';

/**
 * MCP Client implementation
 * Handles communication with MCP servers
 */
export class MCPServerClient implements MCPClient {
  private registry: MCPRegistry;

  /**
   * Initialize the MCP client
   * @param registry MCP server registry
   */
  constructor(registry: MCPRegistry) {
    this.registry = registry;
  }

  /**
   * Send a request to a specific MCP server
   * @param serverId Server ID
   * @param request Request data
   * @returns Response from the server
   */
  async sendRequest(serverId: string, request: MCPRequest): Promise<MCPResponse> {
    const server = this.registry.getServer(serverId);
    
    if (!server) {
      return {
        text: '',
        error: `MCP server not found: ${serverId}`
      };
    }

    if (!server.isEnabled) {
      return {
        text: '',
        error: `MCP server is disabled: ${serverId}`
      };
    }

    try {
      return await this.makeRequest(server, request);
    } catch (error) {
      console.error(`Error calling MCP server ${serverId}:`, error);
      return {
        text: '',
        error: `Error calling MCP server: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Broadcast a request to multiple MCP servers
   * @param request Request data
   * @param serverIds Optional list of server IDs to target (defaults to all enabled servers)
   * @returns Map of server IDs to responses
   */
  async broadcastRequest(request: MCPRequest, serverIds?: string[]): Promise<Record<string, MCPResponse>> {
    const servers = serverIds 
      ? serverIds.map(id => this.registry.getServer(id)).filter(Boolean) as MCPServerConfig[]
      : this.registry.getEnabledServers();
    
    if (servers.length === 0) {
      return {};
    }

    const results: Record<string, MCPResponse> = {};
    
    // Make requests in parallel
    const promises = servers.map(async server => {
      try {
        const response = await this.makeRequest(server, request);
        results[server.id] = response;
      } catch (error) {
        console.error(`Error calling MCP server ${server.id}:`, error);
        results[server.id] = {
          text: '',
          error: `Error calling MCP server: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Make a request to an MCP server
   * @param server Server configuration
   * @param request Request data
   * @returns Response from the server
   */
  private async makeRequest(server: MCPServerConfig, request: MCPRequest): Promise<MCPResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    // Add API key if provided
    if (server.apiKey) {
      headers['Authorization'] = `Bearer ${server.apiKey}`;
    }

    // Make the request
    const response = await fetch(server.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }

    return await response.json() as MCPResponse;
  }
} 