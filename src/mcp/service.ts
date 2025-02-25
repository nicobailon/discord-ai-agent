/**
 * MCP Service
 * Provides a high-level interface for working with MCP servers
 */

import { MCPServerRegistry } from './registry';
import { MCPServerClient } from './client';
import { MCPRequest, MCPResponse, MCPRegistry, MCPClient } from '../types/mcp';

/**
 * MCP Service
 * Provides a high-level interface for working with MCP servers
 */
export class MCPService {
  private registry: MCPRegistry;
  private client: MCPClient;

  /**
   * Initialize the MCP service
   * @param configJson Optional JSON string containing server configurations
   */
  constructor(configJson?: string) {
    this.registry = new MCPServerRegistry(configJson);
    this.client = new MCPServerClient(this.registry);
  }

  /**
   * Get the MCP registry
   * @returns MCP registry
   */
  getRegistry(): MCPRegistry {
    return this.registry;
  }

  /**
   * Get the MCP client
   * @returns MCP client
   */
  getClient(): MCPClient {
    return this.client;
  }

  /**
   * Decide which MCP servers to query based on the query and context
   * @param query The user's query
   * @param context Optional context from memory
   * @returns Array of server IDs to query
   */
  decideMCPservers(query: string, context?: string): string[] {
    // Get all enabled servers
    const enabledServers = this.registry.getEnabledServers();
    
    if (enabledServers.length === 0) {
      return [];
    }
    
    // Extract server IDs and capabilities for analysis
    const serverInfo = enabledServers.map(server => ({
      id: server.id,
      capabilities: server.capabilities || [],
      description: server.description || ''
    }));
    
    // Convert query and context to lowercase for case-insensitive matching
    const queryLower = query.toLowerCase();
    const contextLower = context ? context.toLowerCase() : '';
    const combinedText = `${queryLower} ${contextLower}`;
    
    // Filter servers based on relevance to the query
    const relevantServers = serverInfo.filter(server => {
      // Check if any capabilities match the query
      const hasMatchingCapability = server.capabilities.some(capability => 
        combinedText.includes(capability.toLowerCase())
      );
      
      // Check if server description matches the query
      const descriptionMatches = server.description && 
        combinedText.includes(server.description.toLowerCase());
      
      return hasMatchingCapability || descriptionMatches;
    });
    
    // If we found relevant servers, return their IDs
    if (relevantServers.length > 0) {
      return relevantServers.map(server => server.id);
    }
    
    // If no specific matches, check for general knowledge queries
    // that might benefit from specialized knowledge
    const knowledgeKeywords = [
      'explain', 'how', 'what', 'why', 'when', 'where', 'who',
      'analyze', 'compare', 'difference', 'similar', 'example',
      'technical', 'science', 'history', 'data', 'research',
      'specialized', 'expert', 'detailed'
    ];
    
    const isKnowledgeQuery = knowledgeKeywords.some(keyword => 
      combinedText.includes(keyword)
    );
    
    // For knowledge queries, return all enabled servers
    // as they might provide valuable specialized knowledge
    if (isKnowledgeQuery) {
      return enabledServers.map(server => server.id);
    }
    
    // For other queries, don't use MCP
    return [];
  }

  /**
   * Query MCP servers with just query and context
   * Simplified method for use with Gemini API
   * @param query Query text
   * @param context Context information
   * @param serverIds Optional specific server IDs to query
   * @returns Map of server IDs to responses
   */
  async queryWithContext(
    query: string,
    context: string,
    serverIds?: string[]
  ): Promise<Record<string, MCPResponse>> {
    // If no server IDs provided, use the decision logic
    const idsToQuery = serverIds || this.decideMCPservers(query, context);
    
    if (idsToQuery.length === 0) {
      return {};
    }
    
    // Create the request object
    const request: MCPRequest = {
      query,
      context
    };
    
    // Send the request to the specified servers
    return await this.client.broadcastRequest(request, idsToQuery);
  }

  /**
   * Query a specific MCP server
   * @param serverId Server ID
   * @param query Query text
   * @param context Optional context information
   * @param userId Optional user ID
   * @param channelId Optional channel ID
   * @param options Optional additional options
   * @returns Response from the server
   */
  async query(
    serverId: string,
    query: string,
    context?: string,
    userId?: string,
    channelId?: string,
    options?: Record<string, any>
  ): Promise<MCPResponse> {
    const request: MCPRequest = {
      query,
      context,
      userId,
      channelId,
      options
    };

    return await this.client.sendRequest(serverId, request);
  }

  /**
   * Query all enabled MCP servers
   * @param query Query text
   * @param context Optional context information
   * @param userId Optional user ID
   * @param channelId Optional channel ID
   * @param options Optional additional options
   * @returns Map of server IDs to responses
   */
  async queryAll(
    query: string,
    context?: string,
    userId?: string,
    channelId?: string,
    options?: Record<string, any>
  ): Promise<Record<string, MCPResponse>> {
    const request: MCPRequest = {
      query,
      context,
      userId,
      channelId,
      options
    };

    return await this.client.broadcastRequest(request);
  }

  /**
   * Format MCP responses for Discord
   * @param responses Map of server IDs to responses
   * @returns Formatted response for Discord
   */
  formatResponsesForDiscord(responses: Record<string, MCPResponse>): string {
    const serverIds = Object.keys(responses);
    
    if (serverIds.length === 0) {
      return "No MCP servers responded.";
    }

    // If there's only one response, return it directly
    if (serverIds.length === 1) {
      const response = responses[serverIds[0]];
      
      if (response.error) {
        return `**MCP Error**: ${response.error}`;
      }
      
      return response.text;
    }

    // Format multiple responses
    let result = "**MCP Responses**:\n\n";
    
    for (const serverId of serverIds) {
      const response = responses[serverId];
      const server = this.registry.getServer(serverId);
      const serverName = server ? server.name : serverId;
      
      if (response.error) {
        result += `**${serverName}**: Error - ${response.error}\n\n`;
      } else {
        result += `**${serverName}**:\n${response.text}\n\n`;
      }
    }

    return result;
  }
} 