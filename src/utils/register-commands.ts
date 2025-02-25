/**
 * Discord Slash Command Registration Utility
 * 
 * This script registers slash commands with Discord's API.
 * Run this script when you need to add or update commands.
 */

// Command type definitions
interface CommandOption {
  name: string;
  description: string;
  type: number;
  required?: boolean;
  options?: CommandOption[];
  choices?: { name: string; value: string | number }[];
}

interface Command {
  name: string;
  description: string;
  options?: CommandOption[];
  default_permission?: boolean;
  default_member_permissions?: string;
}

interface RegisterCommandsResult {
  success: boolean;
  commands?: any[];
  error?: any;
}

// Command definitions
const commands: Command[] = [
  {
    name: 'ask',
    description: 'Ask the AI assistant a question',
    options: [
      {
        name: 'question',
        description: 'Your question for the AI',
        type: 3, // STRING
        required: true
      }
    ]
  },
  {
    name: 'search',
    description: 'Search the web for information',
    options: [
      {
        name: 'query',
        description: 'What you want to search for',
        type: 3, // STRING
        required: true
      }
    ]
  },
  {
    name: 'research',
    description: 'Perform deep research on a topic',
    options: [
      {
        name: 'topic',
        description: 'The topic to research',
        type: 3, // STRING
        required: true
      }
    ]
  },
  {
    name: 'imagine',
    description: 'Generate an image based on a prompt',
    options: [
      {
        name: 'prompt',
        description: 'Description of the image you want to generate',
        type: 3, // STRING
        required: true
      }
    ]
  },
  {
    name: 'imagine-hd',
    description: 'Generate a high-quality image (slower but better)',
    options: [
      {
        name: 'prompt',
        description: 'Description of the image you want to generate',
        type: 3, // STRING
        required: true
      }
    ]
  },
  {
    name: 'imagine-fast',
    description: 'Generate an image quickly (faster but lower quality)',
    options: [
      {
        name: 'prompt',
        description: 'Description of the image you want to generate',
        type: 3, // STRING
        required: true
      }
    ]
  },
  {
    name: 'reset',
    description: 'Reset the bot\'s short-term memory of your conversation'
  },
  {
    name: 'mcp',
    description: 'Interact with MCP servers',
    options: [
      {
        name: 'query',
        description: 'Your query for the MCP servers',
        type: 3, // STRING
        required: true
      },
      {
        name: 'server',
        description: 'Specific MCP server to query (optional)',
        type: 3, // STRING
        required: false
      }
    ]
  }
];

/**
 * Register commands with Discord
 * @param {string} applicationId - Discord application ID
 * @param {string} token - Discord bot token
 * @param {Array} commands - Array of command definitions
 * @param {string|null} guildId - Optional guild ID for guild-specific commands
 */
async function registerCommands(
  applicationId: string, 
  token: string, 
  commands: Command[], 
  guildId: string | null = null
): Promise<RegisterCommandsResult> {
  // Determine if we're registering global or guild commands
  const url = guildId
    ? `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`
    : `https://discord.com/api/v10/applications/${applicationId}/commands`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error registering commands:', errorData);
      return { success: false, error: errorData };
    }

    const data = await response.json();
    console.log(`Successfully registered ${data.length} commands!`);
    return { success: true, commands: data };
  } catch (error) {
    console.error('Error registering commands:', error);
    return { success: false, error };
  }
}

// Usage example (uncomment and run this file directly to register commands)
/*
const APPLICATION_ID = 'your-application-id';
const BOT_TOKEN = 'your-bot-token';
const GUILD_ID = null; // Set to null for global commands, or specify a guild ID for testing

registerCommands(APPLICATION_ID, BOT_TOKEN, commands, GUILD_ID)
  .then(result => {
    if (result.success) {
      console.log('Commands registered successfully!');
    } else {
      console.error('Failed to register commands.');
    }
  });
*/

export { commands, registerCommands }; 