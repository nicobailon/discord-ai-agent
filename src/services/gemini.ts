/**
 * Gemini API Service
 * Handles interactions with Google's Gemini API
 */

import { GeminiRequestPayload, GeminiResponse } from '../types';
import { getSystemPrompt } from '../config/system-prompt';
import { MCPService } from '../mcp';
import { MCPResponse } from '../types/mcp';

// Global reference to the MCP service
let mcpService: MCPService;

/**
 * Set the MCP service instance
 * @param service The MCP service instance
 */
export function setMCPService(service: MCPService): void {
  mcpService = service;
}

/**
 * Call the Gemini API with a prompt and context
 * @param {string} prompt - The user's query
 * @param {string} context - Combined context from short and long-term memory
 * @param {string} apiKey - Gemini API key
 * @param {boolean} enableToolUse - Whether to enable tool use capabilities
 * @returns {Promise<string>} - The AI response
 */
export async function callGeminiAPI(prompt: string, context: string, apiKey: string, enableToolUse: boolean = false): Promise<string> {
  try {
    // Gemini API endpoint
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-2.0:generateContent';
    
    // Get the system prompt
    const systemPrompt = getSystemPrompt();
    
    // Add tool use capabilities to the system prompt if enabled
    const enhancedSystemPrompt = enableToolUse 
      ? `${systemPrompt}\n\nYou have autonomous capabilities to use tools when needed. You can search the web, generate images, query MCP servers for specialized knowledge, and perform research without explicit user commands. When a user asks a question that requires up-to-date information, you should automatically search for it. When a user asks for an image, you should automatically generate one. When a user asks a question that might benefit from specialized knowledge, consider querying MCP servers. Use your judgment to determine when to use these tools.`
      : systemPrompt;
    
    // Construct the request payload
    const payload: GeminiRequestPayload = {
      contents: [
        {
          role: "system",
          parts: [
            {
              text: enhancedSystemPrompt
            }
          ]
        },
        {
          role: "user",
          parts: [
            {
              text: `Context: ${context}\n\nUser Query: ${prompt}\n\nPlease respond to the user query based on the provided context.`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };
    
    // Add tool configuration if tool use is enabled
    if (enableToolUse) {
      payload.tools = [
        {
          functionDeclarations: [
            {
              name: "search_web",
              description: "Search the web for current information",
              parameters: {
                type: "OBJECT",
                properties: {
                  query: {
                    type: "STRING",
                    description: "The search query"
                  }
                },
                required: ["query"]
              }
            },
            {
              name: "generate_image",
              description: "Generate an image based on a text description",
              parameters: {
                type: "OBJECT",
                properties: {
                  prompt: {
                    type: "STRING",
                    description: "Description of the image to generate"
                  },
                  quality: {
                    type: "STRING",
                    description: "Quality level: 'fast', 'standard', or 'hd'",
                    enum: ["fast", "standard", "hd"]
                  }
                },
                required: ["prompt", "quality"]
              }
            },
            {
              name: "query_mcp",
              description: "Query MCP servers for specialized knowledge or insights",
              parameters: {
                type: "OBJECT",
                properties: {
                  query: {
                    type: "STRING",
                    description: "The query to send to MCP servers"
                  },
                  context: {
                    type: "STRING",
                    description: "Additional context for the query"
                  }
                },
                required: ["query"]
              }
            }
          ]
        }
      ];
    }
    
    // Make the API request
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      return `Sorry, I encountered an error while processing your request. (Error: ${response.status})`;
    }
    
    const data = await response.json() as GeminiResponse;
    
    // Check if there are tool calls in the response
    if (data.candidates && data.candidates.length > 0 && 
        data.candidates[0].content && 
        data.candidates[0].content.parts && 
        data.candidates[0].content.parts.length > 0) {
      
      // Check for tool calls
      const toolCalls = data.candidates[0].content.parts.filter(part => part.functionCall);
      
      if (toolCalls.length > 0) {
        // Process tool calls
        const results = await processToolCalls(toolCalls, apiKey);
        
        // Generate a follow-up response with the tool results
        return await generateFollowUpResponse(prompt, context, results, apiKey);
      }
      
      // Return the text response if no tool calls
      return data.candidates[0].content.parts[0].text;
    } else {
      console.error('Unexpected Gemini API response structure:', data);
      return "Sorry, I couldn't generate a response at this time.";
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return "Sorry, there was an error processing your request.";
  }
}

/**
 * Process tool calls from Gemini API
 * @param {any[]} toolCalls - The tool calls from Gemini API
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<any>} - The results of the tool calls
 */
async function processToolCalls(toolCalls: any[], apiKey: string): Promise<any> {
  const results = [];
  
  for (const toolCall of toolCalls) {
    const functionCall = toolCall.functionCall;
    
    if (!functionCall) continue;
    
    const functionName = functionCall.name;
    const args = JSON.parse(functionCall.args);
    
    if (functionName === 'search_web') {
      // Implement web search functionality
      const searchResult = await performWebSearch(args.query);
      results.push({
        tool: 'search_web',
        result: searchResult
      });
    } else if (functionName === 'generate_image') {
      // Implement image generation functionality
      const imageResult = await generateImage(args.prompt, args.quality);
      results.push({
        tool: 'generate_image',
        result: imageResult
      });
    } else if (functionName === 'query_mcp') {
      // Implement MCP query functionality
      // Ensure context is always a string
      const contextStr = args.context || '';
      const mcpResult = await queryMCP(args.query, contextStr);
      results.push({
        tool: 'query_mcp',
        result: mcpResult
      });
    }
  }
  
  return results;
}

/**
 * Query MCP servers for specialized knowledge
 * @param {string} query - The query to send to MCP servers
 * @param {string} context - Additional context for the query
 * @returns {Promise<string>} - The formatted MCP response
 */
async function queryMCP(query: string, context: string): Promise<string> {
  try {
    if (!mcpService) {
      return "MCP service is not initialized.";
    }
    
    // Decide which MCP servers to query based on the query and context
    const serverIds = mcpService.decideMCPservers(query, context);
    
    if (serverIds.length === 0) {
      return "No relevant MCP servers found for this query.";
    }
    
    // Query each server individually and combine the results
    const responses: Record<string, MCPResponse> = {};
    
    for (const serverId of serverIds) {
      try {
        // Create a request object with only the required fields
        const request = {
          query,
          context
        };
        
        // Send the request directly to avoid type issues
        const response = await mcpService.getClient().sendRequest(serverId, request);
        responses[serverId] = response;
      } catch (error) {
        console.error(`Error querying MCP server ${serverId}:`, error);
        responses[serverId] = {
          text: `Error querying server: ${error instanceof Error ? error.message : String(error)}`,
          error: `Error: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
    
    // Format the responses for Discord
    return mcpService.formatResponsesForDiscord(responses);
  } catch (error) {
    console.error('Error querying MCP servers:', error);
    return "Sorry, there was an error querying MCP servers.";
  }
}

/**
 * Generate a follow-up response with tool results
 * @param {string} prompt - The original user prompt
 * @param {string} context - The original context
 * @param {any} toolResults - The results from tool calls
 * @param {string} apiKey - Gemini API key
 * @returns {Promise<string>} - The follow-up response
 */
async function generateFollowUpResponse(prompt: string, context: string, toolResults: any, apiKey: string): Promise<string> {
  try {
    // Gemini API endpoint
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-2.0:generateContent';
    
    // Get the system prompt
    const systemPrompt = getSystemPrompt();
    
    // Format tool results
    const formattedResults = JSON.stringify(toolResults, null, 2);
    
    // Construct the request payload
    const payload = {
      contents: [
        {
          role: "system",
          parts: [
            {
              text: systemPrompt
            }
          ]
        },
        {
          role: "user",
          parts: [
            {
              text: `Context: ${context}\n\nUser Query: ${prompt}`
            }
          ]
        },
        {
          role: "model",
          parts: [
            {
              text: "I need to use some tools to answer this question properly."
            }
          ]
        },
        {
          role: "user",
          parts: [
            {
              text: `Here are the results from the tools:\n${formattedResults}\n\nPlease provide a comprehensive response to the original query using this information.`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    };
    
    // Make the API request
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error in follow-up:', errorData);
      return `Sorry, I encountered an error while processing the tool results. (Error: ${response.status})`;
    }
    
    const data = await response.json() as GeminiResponse;
    
    if (data.candidates && data.candidates.length > 0 && 
        data.candidates[0].content && 
        data.candidates[0].content.parts && 
        data.candidates[0].content.parts.length > 0) {
      return data.candidates[0].content.parts[0].text;
    } else {
      console.error('Unexpected Gemini API response structure in follow-up:', data);
      return "Sorry, I couldn't generate a follow-up response at this time.";
    }
  } catch (error) {
    console.error('Error generating follow-up response:', error);
    return "Sorry, there was an error processing the tool results.";
  }
}

/**
 * Perform a web search
 * @param {string} query - The search query
 * @returns {Promise<string>} - The search results
 */
async function performWebSearch(query: string): Promise<string> {
  try {
    // This is a placeholder for actual web search implementation
    // In a real implementation, you would call a search API like Google, Bing, or a custom search service
    
    return `Web search results for "${query}":\n\n` +
           `1. Example result 1 - https://example.com/result1\n` +
           `2. Example result 2 - https://example.com/result2\n` +
           `3. Example result 3 - https://example.com/result3\n\n` +
           `Note: These are placeholder results. Implement actual web search functionality.`;
  } catch (error) {
    console.error('Error performing web search:', error);
    return `Error performing web search for "${query}".`;
  }
}

/**
 * Generate an image
 * @param {string} prompt - The image description
 * @param {string} quality - The quality level
 * @returns {Promise<string>} - The image generation result
 */
async function generateImage(prompt: string, quality: string): Promise<string> {
  try {
    // This is a placeholder for actual image generation implementation
    // In a real implementation, you would call an image generation API like DALL-E, Midjourney, or a custom service
    
    return `Image generated for "${prompt}" with ${quality} quality.\n\n` +
           `Image URL: https://example.com/generated-image.jpg\n\n` +
           `Note: This is a placeholder result. Implement actual image generation functionality.`;
  } catch (error) {
    console.error('Error generating image:', error);
    return `Error generating image for "${prompt}".`;
  }
} 