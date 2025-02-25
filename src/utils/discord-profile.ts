/**
 * Discord Profile Utility
 * Handles setting up and updating the Discord bot's profile
 */

import { getDiscordProfile } from '../config/system-prompt';

/**
 * Update the Discord bot's profile
 * @param {string} botToken - Discord bot token
 * @returns {Promise<boolean>} - Whether the update was successful
 */
export async function updateBotProfile(botToken: string): Promise<boolean> {
  try {
    const profile = getDiscordProfile();
    
    // Update username if provided
    if (profile.username) {
      await updateBotUsername(botToken, profile.username);
    }
    
    // Update avatar if provided
    if (profile.avatar && profile.avatar.startsWith('http')) {
      await updateBotAvatar(botToken, profile.avatar);
    }
    
    // Update bot status and activity if provided
    if (profile.status || profile.activity) {
      await updateBotPresence(botToken, profile.status, profile.activity);
    }
    
    return true;
  } catch (error) {
    console.error('Error updating bot profile:', error);
    return false;
  }
}

/**
 * Update the Discord bot's username
 * @param {string} botToken - Discord bot token
 * @param {string} username - New username
 * @returns {Promise<void>}
 */
async function updateBotUsername(botToken: string, username: string): Promise<void> {
  const response = await fetch('https://discord.com/api/v10/users/@me', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: username
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error('Error updating bot username:', errorData);
    throw new Error(`Failed to update bot username: ${response.status}`);
  }
}

/**
 * Update the Discord bot's avatar
 * @param {string} botToken - Discord bot token
 * @param {string} avatarUrl - URL of the avatar image
 * @returns {Promise<void>}
 */
async function updateBotAvatar(botToken: string, avatarUrl: string): Promise<void> {
  try {
    // Fetch the image
    const imageResponse = await fetch(avatarUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch avatar image: ${imageResponse.status}`);
    }
    
    // Convert to base64
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const dataUri = `data:image/png;base64,${base64Image}`;
    
    // Update the bot's avatar
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        avatar: dataUri
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error updating bot avatar:', errorData);
      throw new Error(`Failed to update bot avatar: ${response.status}`);
    }
  } catch (error) {
    console.error('Error processing avatar update:', error);
    throw error;
  }
}

/**
 * Update the Discord bot's presence (status and activity)
 * @param {string} botToken - Discord bot token
 * @param {string} status - Bot status (online, idle, dnd, invisible)
 * @param {object} activity - Bot activity
 * @returns {Promise<void>}
 */
async function updateBotPresence(
  botToken: string, 
  status: string = 'online', 
  activity: { type: string; name: string } | null = null
): Promise<void> {
  // Map activity type string to Discord activity type number
  const activityTypeMap: Record<string, number> = {
    'PLAYING': 0,
    'STREAMING': 1,
    'LISTENING': 2,
    'WATCHING': 3,
    'COMPETING': 5
  };
  
  const payload: any = {
    status: status.toLowerCase()
  };
  
  if (activity) {
    payload.activities = [{
      name: activity.name,
      type: activityTypeMap[activity.type] || 0
    }];
  }
  
  const response = await fetch('https://discord.com/api/v10/users/@me/settings', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error('Error updating bot presence:', errorData);
    throw new Error(`Failed to update bot presence: ${response.status}`);
  }
} 