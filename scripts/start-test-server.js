const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const envTestPath = path.resolve(__dirname, '../.env.test');

if (!fs.existsSync(envTestPath)) {
  console.error('FATAL: .env.test file not found at:', envTestPath);
  process.exit(1);
}

// Parse .env.test
const envFile = fs.readFileSync(envTestPath, 'utf8');
const envVars = {};

envFile.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      envVars[key] = val;
    }
  }
});

// Explicit Safety Check: Target database MUST be a test database
const mongoUri = envVars.MONGODB_URI || '';
if (!mongoUri.toLowerCase().includes('test')) {
  console.error('FATAL SAFETY VIOLATION: Test server must connect to a database containing "test". Found:', mongoUri);
  process.exit(1);
}

const port = envVars.PORT || '3001';
const isBuilt = fs.existsSync(path.resolve(__dirname, '../.next/BUILD_ID'));
const nextCmd = isBuilt ? 'start' : 'dev';
console.log(`[Test Server] Launching Next.js (${nextCmd}) on port ${port} targeting test DB: ${mongoUri}`);

const npxBinary = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(npxBinary, ['next', nextCmd, '-p', port.toString()], {
  cwd: path.resolve(__dirname, '..'),
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    ...envVars,
    NODE_ENV: 'test',
    PORT: port.toString()
  },
  stdio: 'inherit'
});

child.on('error', (err) => {
  console.error('[Test Server] Failed to start:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
