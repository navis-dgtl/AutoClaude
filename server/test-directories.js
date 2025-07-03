#!/usr/bin/env node

// Test the new directory configuration
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Testing AutoClaude v1.2.0 with new directory configuration...\n');

// Test 1: Check command line argument parsing
console.log('Test 1: Command line directory arguments');
const serverPath = join(__dirname, 'index.js');

// Simulate how Claude Desktop would pass directories
const testDirs = [
  '/Users/nickprince/Desktop',
  '/Users/nickprince/Documents',
  '/Users/nickprince/Downloads'
];

const server = spawn('node', [serverPath, ...testDirs], {
  stdio: 'pipe',
  env: {
    ...process.env,
    AUTOCLAUDE_DATA_DIR: join(__dirname, '../test-data'),
    AUTOCLAUDE_LOGS_DIR: join(__dirname, '../test-logs')
  }
});

let output = '';
server.stderr.on('data', (data) => {
  output += data.toString();
});

// Give server time to start
setTimeout(() => {
  console.log('Server output:');
  console.log(output);
  
  if (output.includes('Allowed directories:') && output.includes('/Users/nickprince/Desktop')) {
    console.log('\n✅ Directory configuration working correctly!');
  } else {
    console.log('\n❌ Directory configuration not working as expected');
  }
  
  server.kill();
  process.exit(0);
}, 1000);
