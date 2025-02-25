import { Router } from 'itty-router';
import { verifyKey } from 'discord-interactions';

// Import our service modules
import { callGeminiAPI, setMCPService } from './services/gemini';
import { performSearch, performDeepResearch, formatSearchResults, formatResearchResults } from './services/perplexity';
import { generateHighQualityImage, generateFastImage, generateFluxImage, formatImageResponse } from './services/falai';

// Import MCP service
import { createMCPService } from './mcp';

// Import utilities
import { updateBotProfile } from './utils/discord-profile';

// Import types
import { 
  DiscordInteraction, 
  DiscordResponse, 
  Env, 
  Message, 
  MemorySearchParams,
  DurableObjectState,
  DiscordMessage,
  MCPTypes
} from './types';

// Create a new router
const router = Router();

// Global MCP service instance
let mcpService: ReturnType<typeof createMCPService>;

// Setup Vectorize index if needed
async function setupVectorizeIndex(env: Env): Promise<void> {
  try {
    const indexInfo = await env.VECTORIZE_INDEX.describe();
    console.log("Using existing Vectorize index:", indexInfo.name);
  } catch (error) {
    console.error("Error with Vectorize index:", error);
    // Index will be created via wrangler.toml configuration
  }
}

// Initialize MCP service
function initializeMCPService(env: Env): void {
  try {
    // Initialize MCP service with configuration from environment
    mcpService = createMCPService(env.MCP_SERVERS);
    console.log("MCP service initialized with", mcpService.getRegistry().getAllServers().length, "servers");
    
    // Set the MCP service in the Gemini service
    setMCPService(mcpService);
  } catch (error) {
    console.error("Error initializing MCP service:", error);
    // Initialize with empty configuration
    mcpService = createMCPService();
    // Set the MCP service in the Gemini service even if empty
    setMCPService(mcpService);
  }
}

// Initialize Discord bot profile
async function initializeBotProfile(env: Env): Promise<void> {
  try {
    if (env.DISCORD_BOT_TOKEN) {
      const success = await updateBotProfile(env.DISCORD_BOT_TOKEN);
      if (success) {
        console.log("Discord bot profile updated successfully");
      } else {
        console.error("Failed to update Discord bot profile");
      }
    } else {
      console.warn("DISCORD_BOT_TOKEN not provided, skipping profile update");
    }
  } catch (error) {
    console.error("Error initializing bot profile:", error);
  }
}

// Verify Discord requests
async function verifyDiscordRequest(request: Request, env: Env): Promise<{ isValid: boolean; body?: DiscordInteraction }> {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  
  if (!signature || !timestamp) {
    return { isValid: false };
  }
  
  const body = await request.text();
  
  const isValidRequest = verifyKey(
    body,
    signature,
    timestamp,
    env.DISCORD_PUBLIC_KEY
  );
  
  if (!isValidRequest) {
    return { isValid: false };
  }

  return { isValid: true, body: JSON.parse(body) };
}

// Handle Discord interactions
router.post('/interactions', async (request: Request, env: Env, ctx: ExecutionContext) => {
  // Verify the request is from Discord
  const { isValid, body } = await verifyDiscordRequest(request.clone(), env);
  
  if (!isValid || !body) {
    return new Response('Invalid request signature', { status: 401 });
  }
  
  const interaction = body;
  
  // Get user and channel info
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const channelId = interaction.channel_id;
  
  if (!userId || !channelId) {
    return new Response('Missing user or channel information', { status: 400 });
  }
  
  const memoryId = `${userId}-${channelId}`;
  
  // Get Durable Object for this user's memory
  const memoryObjectId = env.CONVERSATION_MEMORY.idFromName(memoryId);
  const memoryObject = env.CONVERSATION_MEMORY.get(memoryObjectId);
  
  // Handle different interaction types
  if (interaction.type === 1) {
    // Ping - Discord is checking if our bot is alive
    return new Response(JSON.stringify({ type: 1 }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } else if (interaction.type === 2) {
    // Command interaction
    const { name } = interaction.data || {};
    
    if (!name) {
      return new Response('Missing command name', { status: 400 });
    }
    
    if (name === 'ask') {
      return handleAskCommand(interaction, memoryObject, env, ctx);
    } else if (name === 'search') {
      return handleSearchCommand(interaction, memoryObject, env, ctx);
    } else if (name === 'research') {
      return handleResearchCommand(interaction, memoryObject, env, ctx);
    } else if (name === 'imagine') {
      return handleImagineCommand(interaction, memoryObject, env, ctx);
    } else if (name === 'imagine-hd') {
      return handleImagineHDCommand(interaction, memoryObject, env, ctx);
    } else if (name === 'imagine-fast') {
      return handleImagineQuickCommand(interaction, memoryObject, env, ctx);
    } else if (name === 'mcp') {
      return handleMCPCommand(interaction, memoryObject, env, ctx);
    } else if (name === 'reset') {
      // Clear short-term memory
      await memoryObject.fetch('/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      return new Response(JSON.stringify({
        type: 4,
        data: { content: "Short-term memory has been reset. I still remember our important past conversations but have forgotten our recent chat." }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } else if (interaction.type === 3) {
    // Message Component interaction (buttons, select menus, etc.)
    // Handle component interactions here if needed
  } else if (interaction.type === 4) {
    // Application Command Autocomplete interaction
    // Handle autocomplete interactions here if needed
  } else if (interaction.type === 5) {
    // Modal Submit interaction
    // Handle modal submissions here if needed
  }
  
  return new Response(JSON.stringify({ error: 'Unknown interaction' }), { status: 400 });
});

// Handle Discord gateway events (for @mentions)
router.post('/webhook', async (request: Request, env: Env, ctx: ExecutionContext) => {
  // For gateway events, we don't need to verify the signature
  // as these are coming directly from our bot client
  
  try {
    const body = await request.json() as { t: string; d: any };
    
    // Check if this is a message create event
    if (body.t === 'MESSAGE_CREATE' && body.d) {
      const messageData = body.d;
      
      // Create a message object from the gateway event that matches DiscordMessage interface
      const message: DiscordMessage = {
        id: messageData.id,
        channel_id: messageData.channel_id,
        guild_id: messageData.guild_id,
        author: messageData.author,
        content: messageData.content,
        timestamp: messageData.timestamp,
        edited_timestamp: messageData.edited_timestamp,
        tts: messageData.tts || false,
        mention_everyone: messageData.mention_everyone || false,
        mentions: messageData.mentions || [],
        mention_roles: messageData.mention_roles || [],
        attachments: messageData.attachments || [],
        embeds: messageData.embeds || [],
        reactions: messageData.reactions || [],
        pinned: messageData.pinned || false,
        type: messageData.type || 0
      };
      
      // Process the message
      ctx.waitUntil(handleMessageEvent(message, env, ctx));
    }
    
    // Always respond with success
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Handle Discord message events
async function handleMessageEvent(message: DiscordMessage, env: Env, ctx: ExecutionContext): Promise<void> {
  // Ignore messages from bots to prevent loops
  if (message.author.bot) return;
  
  // Get the bot's user ID
  const botId = await getBotUserId(env);
  if (!botId) return;
  
  // Check if the bot was mentioned
  const isBotMentioned = message.mentions?.some(user => user.id === botId) || 
                         message.content.includes(`<@${botId}>`) || 
                         message.content.includes(`<@!${botId}>`);
  
  if (isBotMentioned) {
    // Get user and channel info
    const userId = message.author.id;
    const channelId = message.channel_id;
    
    // Get Durable Object for this user's memory
    const memoryId = `${userId}-${channelId}`;
    const memoryObjectId = env.CONVERSATION_MEMORY.idFromName(memoryId);
    const memoryObject = env.CONVERSATION_MEMORY.get(memoryObjectId);
    
    // Extract the query (remove the mention)
    let query = message.content
      .replace(new RegExp(`<@!?${botId}>`, 'g'), '')
      .trim();
    
    // If the message is just a mention with no content, provide a default response
    if (!query) {
      query = "Hello! How can I help you today?";
    }
    
    // Get recent conversation history from short-term memory
    const historyResponse = await memoryObject.fetch('/recent?count=5', {
      method: 'GET'
    });
    const recentHistory = await historyResponse.json() as Message[];
    
    // Search for semantically similar past conversations from long-term memory
    const searchParams: MemorySearchParams = {
      query: query,
      userId: userId,
      channelId: channelId,
      limit: 3
    };
    
    const semanticSearchResponse = await memoryObject.fetch('/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchParams)
    });
    const semanticResults = await semanticSearchResponse.json() as Message[];
    
    // Combine recent history with semantic search results for comprehensive context
    const combinedContext = buildCombinedContext(recentHistory, semanticResults);
    
    // Add current message to memory
    const userMessage: Message = {
      role: 'user', 
      content: query,
      userId: userId,
      channelId: channelId
    };
    
    await memoryObject.fetch('/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userMessage)
    });
    
    // Call Gemini API with enhanced context and tool-use capabilities
    const geminiResponse = await callGeminiAPI(query, combinedContext, env.GEMINI_API_KEY, true);
    
    // Add AI response to memory
    const assistantMessage: Message = {
      role: 'assistant', 
      content: geminiResponse,
      userId: userId,
      channelId: channelId
    };
    
    await memoryObject.fetch('/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assistantMessage)
    });
    
    // Send the response to Discord
    await sendDiscordMessage(env, message.channel_id, geminiResponse);
  }
}

// Get the bot's user ID
async function getBotUserId(env: Env): Promise<string | null> {
  try {
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`
      }
    });
    
    if (!response.ok) {
      console.error('Error fetching bot user info:', await response.text());
      return null;
    }
    
    const data = await response.json() as { id: string };
    return data.id;
  } catch (error) {
    console.error('Error getting bot user ID:', error);
    return null;
  }
}

// Send a message to a Discord channel
async function sendDiscordMessage(env: Env, channelId: string, content: string): Promise<void> {
  try {
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });
    
    if (!response.ok) {
      console.error('Error sending Discord message:', await response.text());
    }
  } catch (error) {
    console.error('Error sending Discord message:', error);
  }
}

// Catch-all route
router.all('*', () => new Response('Not Found', { status: 404 }));

// Main worker handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Ensure Vectorize index is set up
    await setupVectorizeIndex(env);
    
    // Initialize bot profile (only needs to be done once, but we'll do it on each cold start)
    ctx.waitUntil(initializeBotProfile(env));
    
    // Route the request
    return router.handle(request, env, ctx);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // ... existing code ...
  },

  async queue(batch: MessageBatch, env: Env, ctx: ExecutionContext): Promise<void> {
    // ... existing code ...
  },

  async discord(message: DiscordMessage, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Initialize services
    await setupVectorizeIndex(env);
    initializeMCPService(env);
    await initializeBotProfile(env);

    // Process the message
    ctx.waitUntil(handleMessageEvent(message, env, ctx));
    
    // Return a success response
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Command handlers
async function handleAskCommand(
  interaction: DiscordInteraction, 
  memoryObject: any, 
  env: Env, 
  ctx: ExecutionContext
): Promise<Response> {
  if (!interaction.data?.options || !interaction.data.options[0]?.value) {
    return new Response('Missing query parameter', { status: 400 });
  }
  
  const query = interaction.data.options[0].value as string;
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const channelId = interaction.channel_id;
  
  if (!userId || !channelId) {
    return new Response('Missing user or channel information', { status: 400 });
  }
  
  // Get recent conversation history from short-term memory
  const historyResponse = await memoryObject.fetch('/recent?count=5', {
    method: 'GET'
  });
  const recentHistory = await historyResponse.json() as Message[];
  
  // Search for semantically similar past conversations from long-term memory
  const searchParams: MemorySearchParams = {
    query: query,
    userId: userId,
    channelId: channelId,
    limit: 3
  };
  
  const semanticSearchResponse = await memoryObject.fetch('/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(searchParams)
  });
  const semanticResults = await semanticSearchResponse.json() as Message[];
  
  // Combine recent history with semantic search results for comprehensive context
  const combinedContext = buildCombinedContext(recentHistory, semanticResults);
  
  // Add current message to memory
  const userMessage: Message = {
    role: 'user', 
    content: query,
    userId: userId,
    channelId: channelId
  };
  
  await memoryObject.fetch('/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userMessage)
  });
  
  // Call Gemini API with enhanced context
  const geminiResponse = await callGeminiAPI(query, combinedContext, env.GEMINI_API_KEY);
  
  // Add AI response to memory
  const assistantMessage: Message = {
    role: 'assistant', 
    content: geminiResponse,
    userId: userId,
    channelId: channelId
  };
  
  await memoryObject.fetch('/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assistantMessage)
  });
  
  // Respond to Discord
  const discordResponse: DiscordResponse = {
    type: 4,
    data: { content: geminiResponse }
  };
  
  return new Response(JSON.stringify(discordResponse), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handle MCP command
async function handleMCPCommand(
  interaction: DiscordInteraction, 
  memoryObject: any, 
  env: Env, 
  ctx: ExecutionContext
): Promise<Response> {
  if (!interaction.data?.options || !interaction.data.options[0]?.value) {
    return new Response('Missing query parameter', { status: 400 });
  }
  
  // Get the query from the command options
  const query = interaction.data.options[0].value as string;
  
  // Check if a specific server was specified
  const serverOption = interaction.data.options.find(opt => opt.name === 'server');
  const specificServer = serverOption?.value as string | undefined;
  
  // Acknowledge the interaction immediately to prevent timeout
  const response: DiscordResponse = {
    type: 5, // Deferred response
    data: { content: "Processing your MCP query..." }
  };
  
  // Send the acknowledgement
  const ackResponse = new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  // Process the MCP query in the background
  ctx.waitUntil(processMCPQuery(interaction, query, specificServer, env));
  
  return ackResponse;
}

// Process MCP query and send follow-up message
async function processMCPQuery(
  interaction: DiscordInteraction,
  query: string,
  specificServer?: string,
  env?: Env
): Promise<void> {
  try {
    // Get the interaction token for follow-up messages
    const { application_id, token } = interaction;
    
    if (!application_id || !token || !env?.DISCORD_BOT_TOKEN) {
      console.error('Missing required information for follow-up message');
      return;
    }
    
    let result: string;
    
    // Execute the MCP query
    if (specificServer) {
      // Query a specific MCP server
      const server = mcpService.getRegistry().getServer(specificServer);
      if (!server) {
        result = `Error: Server "${specificServer}" not found. Available servers: ${mcpService.getRegistry().getAllServers().map(s => s.id).join(', ')}`;
      } else {
        try {
          const response = await mcpService.query(server.id, query);
          if (response.error) {
            result = `Error from ${server.id}: ${response.error}`;
          } else {
            result = `Response from ${server.id}:\n\n${response.text}`;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result = `Error querying server "${specificServer}": ${errorMessage}`;
        }
      }
    } else {
      // Query all available MCP servers
      try {
        const responses = await mcpService.queryAll(query);
        const serverIds = Object.keys(responses);
        
        if (serverIds.length === 0) {
          result = "No MCP servers available or no responses received.";
        } else {
          result = mcpService.formatResponsesForDiscord(responses);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result = `Error querying MCP servers: ${errorMessage}`;
      }
    }
    
    // Send follow-up message with the result
    const followUpUrl = `https://discord.com/api/v10/webhooks/${application_id}/${token}/messages/@original`;
    
    await fetch(followUpUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bot ${env.DISCORD_BOT_TOKEN}`
      },
      body: JSON.stringify({
        content: result.length > 2000 ? result.substring(0, 1997) + '...' : result
      })
    });
  } catch (error) {
    console.error('Error processing MCP query:', error instanceof Error ? error.message : String(error));
  }
}

async function handleSearchCommand(
  interaction: DiscordInteraction, 
  memoryObject: any, 
  env: Env, 
  ctx: ExecutionContext
): Promise<Response> {
  if (!interaction.data?.options || !interaction.data.options[0]?.value) {
    return new Response('Missing query parameter', { status: 400 });
  }
  
  const query = interaction.data.options[0].value as string;
  
  // First, respond with a "thinking" message
  const response = new Response(JSON.stringify({
    type: 5, // Deferred response
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  // Perform the search using Perplexity API
  const searchResults = await performSearch(query, env.PERPLEXITY_API_KEY);
  
  // Format the results for Discord
  const formattedResults = formatSearchResults(searchResults);
  
  // Send the follow-up message with the results
  await fetch(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: formattedResults
    }),
  });
  
  return response;
}

async function handleResearchCommand(
  interaction: DiscordInteraction, 
  memoryObject: any, 
  env: Env, 
  ctx: ExecutionContext
): Promise<Response> {
  if (!interaction.data?.options || !interaction.data.options[0]?.value) {
    return new Response('Missing query parameter', { status: 400 });
  }
  
  const query = interaction.data.options[0].value as string;
  
  // First, respond with a "thinking" message
  const response = new Response(JSON.stringify({
    type: 5, // Deferred response
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  // Perform deep research using Perplexity API
  const researchResults = await performDeepResearch(query, env.PERPLEXITY_API_KEY);
  
  // Format the results for Discord
  const formattedResults = formatResearchResults(researchResults);
  
  // Send the follow-up message with the results
  await fetch(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: formattedResults
    }),
  });
  
  return response;
}

async function handleImagineCommand(
  interaction: DiscordInteraction, 
  memoryObject: any, 
  env: Env, 
  ctx: ExecutionContext
): Promise<Response> {
  if (!interaction.data?.options || !interaction.data.options[0]?.value) {
    return new Response('Missing prompt parameter', { status: 400 });
  }
  
  const prompt = interaction.data.options[0].value as string;
  
  // First, respond with a "thinking" message
  const response = new Response(JSON.stringify({
    type: 5, // Deferred response
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  // Generate image using fal.ai FLUX model
  const imageResult = await generateFluxImage(prompt, env.FAL_API_KEY);
  
  // Format the response for Discord
  const formattedResponse = formatImageResponse(imageResult, prompt);
  
  // Send the follow-up message with the image
  await fetch(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formattedResponse),
  });
  
  return response;
}

async function handleImagineHDCommand(
  interaction: DiscordInteraction, 
  memoryObject: any, 
  env: Env, 
  ctx: ExecutionContext
): Promise<Response> {
  if (!interaction.data?.options || !interaction.data.options[0]?.value) {
    return new Response('Missing prompt parameter', { status: 400 });
  }
  
  const prompt = interaction.data.options[0].value as string;
  
  // First, respond with a "thinking" message
  const response = new Response(JSON.stringify({
    type: 5, // Deferred response
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  // Generate high-quality image using SD 3.5 Large
  const imageResult = await generateHighQualityImage(prompt, env.FAL_API_KEY);
  
  // Format the response for Discord
  const formattedResponse = formatImageResponse(imageResult, prompt);
  
  // Send the follow-up message with the image
  await fetch(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formattedResponse),
  });
  
  return response;
}

async function handleImagineQuickCommand(
  interaction: DiscordInteraction, 
  memoryObject: any, 
  env: Env, 
  ctx: ExecutionContext
): Promise<Response> {
  if (!interaction.data?.options || !interaction.data.options[0]?.value) {
    return new Response('Missing prompt parameter', { status: 400 });
  }
  
  const prompt = interaction.data.options[0].value as string;
  
  // First, respond with a "thinking" message
  const response = new Response(JSON.stringify({
    type: 5, // Deferred response
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  // Generate fast image using SD 3.5 Turbo
  const imageResult = await generateFastImage(prompt, env.FAL_API_KEY);
  
  // Format the response for Discord
  const formattedResponse = formatImageResponse(imageResult, prompt);
  
  // Send the follow-up message with the image
  await fetch(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formattedResponse),
  });
  
  return response;
}

function buildCombinedContext(recentHistory: Message[], semanticResults: Message[]): string {
  let context = "Recent conversation:\n";
  
  // Add recent history
  if (recentHistory && recentHistory.length > 0) {
    context += recentHistory.map(msg => 
      `${msg.role}: ${msg.content}`
    ).join('\n');
  } else {
    context += "No recent conversation.";
  }
  
  // Add relevant past conversations if available
  if (semanticResults && semanticResults.length > 0) {
    context += "\n\nRelevant past conversations:\n";
    context += semanticResults.map(msg => 
      `[${new Date(msg.timestamp || '').toLocaleString()}] ${msg.role}: ${msg.content}`
    ).join('\n');
  }
  
  return context;
}

// Export the Durable Object class
export class ConversationMemory {
  state: DurableObjectState;
  env: Env;
  storage: any;
  messages: Message[];

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.storage = state.storage;
    this.messages = [];
  }

  async initialize(): Promise<void> {
    const stored = await this.storage.get("messages");
    this.messages = stored || [];
  }

  async addMessage(message: Message): Promise<Message[]> {
    await this.initialize();
    
    // Add timestamp to message
    message.timestamp = new Date().toISOString();
    
    // Add to messages array
    this.messages.push(message);
    
    // Keep only last 20 messages
    if (this.messages.length > 20) {
      this.messages = this.messages.slice(this.messages.length - 20);
    }
    
    // Store updated messages
    await this.storage.put("messages", this.messages);
    
    // Also store in long-term memory (Vectorize)
    await this.storeInVectorize(message);
    
    return this.messages;
  }

  async getRecentMessages(count = 5): Promise<Message[]> {
    await this.initialize();
    return this.messages.slice(-count);
  }

  async clearMemory(): Promise<{ success: boolean }> {
    await this.storage.delete("messages");
    this.messages = [];
    return { success: true };
  }
  
  async storeInVectorize(message: Message): Promise<void> {
    try {
      // Generate embedding for the message content
      const embedding = await this.env.AI.run('@cf/baai/bge-small-en-v1.5', {
        text: message.content
      });
      
      // Store in Vectorize with metadata
      await this.env.VECTORIZE_INDEX.upsert([{
        id: `${message.userId}-${message.channelId}-${message.timestamp}`,
        values: embedding,
        metadata: {
          userId: message.userId,
          channelId: message.channelId,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp
        }
      }]);
    } catch (error) {
      console.error("Error storing in Vectorize:", error);
    }
  }

  async searchSimilarMessages(query: string, userId: string, channelId: string, limit = 5): Promise<Message[]> {
    try {
      // Generate embedding for the query
      const embedding = await this.env.AI.run('@cf/baai/bge-small-en-v1.5', {
        text: query
      });
      
      // Search Vectorize for similar messages
      const results = await this.env.VECTORIZE_INDEX.query(embedding, {
        topK: limit,
        filter: {
          userId: userId,
          channelId: channelId
        }
      });
      
      return results.matches.map((match: any) => match.metadata);
    } catch (error) {
      console.error("Error searching in Vectorize:", error);
      return [];
    }
  }

  // Handle HTTP requests from the Worker
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.split('/').filter(p => p);
    
    if (request.method === 'POST') {
      const data = await request.json();
      
      if (path[0] === 'add') {
        return new Response(JSON.stringify(await this.addMessage(data as Message)), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else if (path[0] === 'clear') {
        return new Response(JSON.stringify(await this.clearMemory()), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else if (path[0] === 'search') {
        const { query, userId, channelId, limit } = data as MemorySearchParams;
        return new Response(JSON.stringify(await this.searchSimilarMessages(query, userId, channelId, limit)), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else if (request.method === 'GET') {
      if (path[0] === 'recent') {
        const count = parseInt(url.searchParams.get('count') || '5');
        return new Response(JSON.stringify(await this.getRecentMessages(count)), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response('Not found', { status: 404 });
  }
} 