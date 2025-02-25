# Discord AI Agent with Enhanced Memory

A Discord bot that integrates multiple AI services with an advanced memory system using Cloudflare Durable Objects and Vectorize. The bot leverages natural language processing, image generation, web search capabilities, and maintains both short-term conversation history and long-term semantic memory for more contextual responses.

## Features

- **Conversational AI**: Powered by Google's Gemini Flash 2.0
- **Web Search**: Integrated with Perplexity AI for web search with citations
- **Image Generation**: Connected to fal.ai for high-quality image generation
- **Enhanced Memory System**:
  - Short-term memory using Cloudflare Durable Objects
  - Long-term semantic memory using Cloudflare Vectorize
  - Contextual retrieval of past conversations
- **TypeScript Support**: Fully typed codebase for better developer experience
- **Customizable Persona**: Configurable system prompt and Discord profile

## Commands

- `/ask [question]` - Ask the AI assistant a question
- `/search [query]` - Search the web for information
- `/research [topic]` - Perform deep research on a topic
- `/imagine [prompt]` - Generate an image based on a prompt
- `/imagine-hd [prompt]` - Generate a high-quality image (slower but better)
- `/imagine-fast [prompt]` - Generate an image quickly (faster but lower quality)
- `/reset` - Reset the bot's short-term memory of your conversation

## Natural Conversation

In addition to slash commands, you can also interact with the bot naturally by mentioning it in any channel:

- `@Nexus [your message]` - Chat with the AI assistant naturally
- `@Nexus what's the weather like?` - The bot will automatically search the web for current weather information
- `@Nexus create an image of a sunset over mountains` - The bot will automatically generate the requested image

The bot has autonomous capabilities to use tools when needed. It can search the web, generate images, and perform research without explicit commands, based on the context of your conversation.

## Technology Stack

- **TypeScript**: For type safety and better developer experience
- **Discord.js**: For Discord API integration
- **Cloudflare Workers**: For serverless deployment
- **Cloudflare Durable Objects**: For short-term memory
- **Cloudflare Vectorize**: For long-term semantic memory
- **AI Services**:
  - Google Gemini Flash 2.0
  - Perplexity AI
  - fal.ai (Stable Diffusion 3.5 & FLUX)

## Setup

### Prerequisites

- Node.js (v18 or higher)
- Cloudflare Workers account (paid plan required for Vectorize)
- Discord Developer account
- API keys for Gemini, Perplexity, and fal.ai

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure your environment variables in `wrangler.toml`:
   ```
   [vars]
   DISCORD_PUBLIC_KEY = "your-discord-public-key"
   DISCORD_BOT_TOKEN = "your-discord-bot-token"
   PERPLEXITY_API_KEY = "your-perplexity-api-key"
   FAL_API_KEY = "your-fal-api-key"
   GEMINI_API_KEY = "your-gemini-api-key"
   ```

### Registering Discord Commands

1. Create a Discord application and bot at the [Discord Developer Portal](https://discord.com/developers/applications)
2. Get your application ID and bot token
3. Edit `src/utils/register-commands.ts` with your application ID and bot token
4. Run the command registration script:
   ```
   npx ts-node src/utils/register-commands.ts
   ```

### Customizing the Bot Persona

The bot's personality and behavior are defined through a system prompt in `src/config/system-prompt.ts`. You can modify this file to customize:

1. **System Prompt**: The AI's persona, capabilities, and behavioral guidelines
2. **Discord Profile**: The bot's username, avatar, bio, and status

```typescript
// Example system prompt configuration
export const SYSTEM_PROMPT = `You are Nexus, an advanced AI assistant for Discord with enhanced memory capabilities.

Your personality traits:
- Friendly and approachable, with a touch of humor
- Knowledgeable but humble, acknowledging when you don't know something
...`;

// Example Discord profile configuration
export const DISCORD_PROFILE = {
  username: "Nexus AI",
  avatar: "https://example.com/your-bot-avatar.png",
  bio: "Advanced AI assistant with enhanced memory...",
  status: "online",
  activity: {
    type: "PLAYING",
    name: "with neural networks"
  }
};
```

The bot will automatically update its Discord profile based on these settings when it starts up.

#### Updating the Bot's Avatar

You can update the bot's avatar using the provided script:

```bash
npm run update-avatar <bot-token> <path-to-image>
```

For example:
```bash
npm run update-avatar YOUR_BOT_TOKEN ./assets/nexus-avatar.png
```

This will update the bot's avatar with the specified image. Supported formats include PNG, JPG, and GIF.

### Development

For local development:

```
npm run dev
```

For type checking:

```
npm run type-check
```

### Deployment

Deploy to Cloudflare Workers:

```
npm run deploy
```

## Architecture

### Dual-Layer Memory Architecture

- **Short-term Memory**: Durable Objects for recent conversation history
- **Long-term Memory**: Vectorize for semantic search across all historical conversations
- **Memory Integration**: Combines both systems for comprehensive context retrieval

### Memory Features

- **Semantic Conversation Recall**: Retrieve contextually relevant conversations from weeks or months ago
- **Topic-Based Recall**: Identify and retrieve past conversations on similar topics
- **User Preference Learning**: Build a profile of user preferences over time through semantic analysis

## License

MIT
