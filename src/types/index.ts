/**
 * Type definitions for the Discord AI Agent
 */

import { ExecutionContext, VectorizeIndex, CloudflareAI } from './cloudflare';
// Import MCP types
import * as MCPTypes from './mcp';

// Re-export Cloudflare types
export { ExecutionContext, VectorizeIndex, CloudflareAI };

// Re-export MCP types
export { MCPTypes };

// Discord Interaction Types
export interface DiscordInteraction {
  id: string;
  application_id: string;
  type: number;
  data?: InteractionData;
  guild_id?: string;
  channel_id?: string;
  member?: {
    user: DiscordUser;
    roles: string[];
    permissions: string;
  };
  user?: DiscordUser;
  token: string;
  version: number;
}

// Discord Message Type
export interface DiscordMessage {
  id: string;
  channel_id: string;
  guild_id?: string;
  author: DiscordUser;
  content: string;
  timestamp: string;
  edited_timestamp?: string;
  tts: boolean;
  mention_everyone: boolean;
  mentions: DiscordUser[];
  mention_roles: string[];
  attachments: any[];
  embeds: any[];
  reactions?: any[];
  nonce?: string | number;
  pinned: boolean;
  webhook_id?: string;
  type: number;
  reference?: {
    message_id?: string;
    channel_id: string;
    guild_id?: string;
  };
}

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  bot?: boolean;
  system?: boolean;
  mfa_enabled?: boolean;
  locale?: string;
  verified?: boolean;
  email?: string;
  flags?: number;
  premium_type?: number;
  public_flags?: number;
}

export interface InteractionData {
  id?: string;
  name?: string;
  type?: number;
  options?: InteractionOption[];
  custom_id?: string;
  component_type?: number;
  values?: string[];
  target_id?: string;
  components?: any[];
}

export interface InteractionOption {
  name: string;
  type: number;
  value?: string | number | boolean;
  options?: InteractionOption[];
  focused?: boolean;
}

export interface DiscordResponse {
  type: number;
  data?: {
    content?: string;
    embeds?: DiscordEmbed[];
    flags?: number;
    components?: any[];
  };
}

export interface DiscordEmbed {
  title?: string;
  type?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: {
    text: string;
    icon_url?: string;
    proxy_icon_url?: string;
  };
  image?: {
    url: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  thumbnail?: {
    url: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  video?: {
    url: string;
    proxy_url?: string;
    height?: number;
    width?: number;
  };
  provider?: {
    name?: string;
    url?: string;
  };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
    proxy_icon_url?: string;
  };
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
}

// Memory Types
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  userId: string;
  channelId: string;
  timestamp?: string;
}

export interface MemorySearchParams {
  query: string;
  userId: string;
  channelId: string;
  limit?: number;
}

// API Response Types
export interface ApiResponse<T> {
  error: boolean;
  data?: T;
  message?: string;
}

// Gemini API Types
export interface GeminiRequestPayload {
  contents: {
    role: string;
    parts: {
      text: string;
    }[];
  }[];
  generationConfig: {
    temperature: number;
    topK: number;
    topP: number;
    maxOutputTokens: number;
  };
  safetySettings: {
    category: string;
    threshold: string;
  }[];
  tools?: {
    functionDeclarations: {
      name: string;
      description: string;
      parameters: {
        type: string;
        properties: {
          [key: string]: {
            type: string;
            description: string;
            enum?: string[];
          };
        };
        required: string[];
      };
    }[];
  }[];
}

export interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text?: string;
        functionCall?: {
          name: string;
          args: string;
        };
      }[];
    };
  }[];
}

// Perplexity API Types
export interface PerplexitySearchParams {
  query: string;
  max_results: number;
  include_citations: boolean;
  highlight_citations: boolean;
}

export interface PerplexityResearchParams {
  query: string;
  focus: string;
  max_sources: number;
  include_citations: boolean;
  highlight_citations: boolean;
}

export interface PerplexityResult {
  answer: string;
  citations: {
    title: string;
    url: string;
  }[];
  query: string;
}

// fal.ai API Types
export interface FalImageGenerationParams {
  prompt: string;
  image_size?: string;
  num_inference_steps?: number;
  guidance_scale?: number;
}

export interface FalImageResult {
  images?: {
    url: string;
  }[];
  image?: {
    url: string;
  };
  url?: string;
}

// Environment Variables
export interface Env {
  DISCORD_PUBLIC_KEY: string;
  DISCORD_BOT_TOKEN: string;
  PERPLEXITY_API_KEY: string;
  FAL_API_KEY: string;
  GEMINI_API_KEY: string;
  CONVERSATION_MEMORY: DurableObjectNamespace;
  VECTORIZE_INDEX: VectorizeIndex;
  AI: CloudflareAI;
  // MCP configuration
  MCP_SERVERS?: string; // JSON string of MCPServerConfig[]
}

// Durable Object Types
export interface DurableObjectState {
  storage: DurableObjectStorage;
}

export interface DurableObjectStorage {
  get(key: string): Promise<any>;
  put(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObject;
}

export interface DurableObjectId {
  toString(): string;
}

export interface DurableObject {
  fetch(request: Request | string, init?: RequestInit): Promise<Response>;
} 