/**
 * Command-line script to register Discord commands
 * 
 * Usage:
 * npx ts-node src/utils/register-commands-cli.ts <application-id> <bot-token> [guild-id]
 */

import { commands, registerCommands } from './register-commands';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: npx ts-node src/utils/register-commands-cli.ts <application-id> <bot-token> [guild-id]');
    process.exit(1);
  }
  
  const applicationId = args[0];
  const botToken = args[1];
  const guildId = args.length > 2 ? args[2] : null;
  
  console.log(`Registering commands for application ${applicationId}${guildId ? ` in guild ${guildId}` : ' globally'}...`);
  
  try {
    const result = await registerCommands(applicationId, botToken, commands, guildId);
    
    if (result.success) {
      console.log(`Successfully registered ${result.commands?.length || 0} commands!`);
    } else {
      console.error('Failed to register commands:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error registering commands:', error);
    process.exit(1);
  }
}

main(); 