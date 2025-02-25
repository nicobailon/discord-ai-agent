/**
 * Script to update the Discord bot's avatar
 * 
 * Usage:
 * node scripts/update-avatar.js <bot-token> <image-path>
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Check if we have the required arguments
if (process.argv.length < 4) {
  console.error('Usage: node scripts/update-avatar.js <bot-token> <image-path>');
  process.exit(1);
}

const botToken = process.argv[2];
const imagePath = process.argv[3];

// Validate the image path
if (!fs.existsSync(imagePath)) {
  console.error(`Error: Image file not found at ${imagePath}`);
  process.exit(1);
}

// Read the image file
const imageBuffer = fs.readFileSync(imagePath);
const base64Image = imageBuffer.toString('base64');
const dataUri = `data:image/${path.extname(imagePath).substring(1)};base64,${base64Image}`;

// Update the bot's avatar
const options = {
  hostname: 'discord.com',
  path: '/api/v10/users/@me',
  method: 'PATCH',
  headers: {
    'Authorization': `Bot ${botToken}`,
    'Content-Type': 'application/json',
  }
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('Avatar updated successfully!');
    } else {
      console.error(`Error updating avatar: ${res.statusCode}`);
      console.error(data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error updating avatar:', error);
});

req.write(JSON.stringify({
  avatar: dataUri
}));

req.end();

console.log('Updating avatar...'); 