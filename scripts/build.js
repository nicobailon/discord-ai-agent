/**
 * Build script for TypeScript compilation and file management
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Run TypeScript compiler
console.log('Compiling TypeScript...');
try {
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('TypeScript compilation successful!');
} catch (error) {
  console.error('TypeScript compilation failed:', error.message);
  process.exit(1);
}

console.log('Build completed successfully!'); 