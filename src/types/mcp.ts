/**
 * MCP (Model Context Protocol) Types
 * Defines types for MCP server integration
 */

// MCP Server Configuration
export interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  description?: string;
  capabilities?: string[];
  isEnabled: boolean;
}

// MCP Request Types
export interface MCPRequest {
  query: string;
  context?: string;
  userId?: string;
  channelId?: string;
  options?: Record<string, any>;
}

// MCP Response Types
export interface MCPResponse {
  text: string;
  images?: MCPImage[];
  sources?: MCPSource[];
  metadata?: Record<string, any>;
  error?: string;
}

export interface MCPImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface MCPSource {
  title: string;
  url: string;
  description?: string;
}

// MCP Server Registry
export interface MCPRegistry {
  servers: MCPServerConfig[];
  getServer(id: string): MCPServerConfig | undefined;
  getAllServers(): MCPServerConfig[];
  getEnabledServers(): MCPServerConfig[];
}

// MCP Client Interface
export interface MCPClient {
  sendRequest(serverId: string, request: MCPRequest): Promise<MCPResponse>;
  broadcastRequest(request: MCPRequest, serverIds?: string[]): Promise<Record<string, MCPResponse>>;
} 