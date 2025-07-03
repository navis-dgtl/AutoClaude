#!/usr/bin/env node

// Simple test script for AutoClaude
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Testing AutoClaude Extension...\n');

// Test 1: Check if server starts
console.log('Test 1: Starting server...');
const serverPath = join(__dirname, 'index.js');
const server = spawn('node', [serverPath], {
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
  if (output.includes('AutoClaude Automation & Workflow Manager running')) {
    console.log('✅ Server started successfully');
    console.log('Output:', output);
  } else {
    console.log('❌ Server failed to start');
    console.log('Output:', output);
  }
  
  // Test 2: Send a tools list request
  console.log('\nTest 2: Requesting tools list...');
  const testRequest = {
    jsonrpc: "2.0",
    method: "tools/list",
    id: 1
  };
  
  server.stdin.write(JSON.stringify(testRequest) + '\n');
  
  let response = '';
  server.stdout.on('data', (data) => {
    response += data.toString();
    try {
      const parsed = JSON.parse(response);
      if (parsed.result && parsed.result.tools) {
        console.log('✅ Received tools list:', parsed.result.tools.length, 'tools');
        parsed.result.tools.forEach(tool => {
          console.log(`  - ${tool.name}: ${tool.description}`);
        });
      }
    } catch (e) {
      // Response might be incomplete
    }
  });
  
  // Clean up after tests
  setTimeout(() => {
    console.log('\n✅ All tests completed');
    server.kill();
    process.exit(0);
  }, 3000);
}, 1000);

server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});
