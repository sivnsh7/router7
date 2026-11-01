#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CLI_DIR = path.resolve(ROOT, 'cli');

const SERVER_DIST = path.resolve(ROOT, 'server/dist');
const CLIENT_DIST = path.resolve(ROOT, 'client/dist');
const CLI_SERVER_TARGET = path.resolve(CLI_DIR, 'server-dist');
const CLI_CLIENT_TARGET = path.resolve(CLI_DIR, 'client-dist');

console.log('Bundling standalone distribution into cli package...');

if (!fs.existsSync(SERVER_DIST)) {
  console.error('Error: server/dist does not exist. Run "npm run build -w server" first.');
  process.exit(1);
}

if (!fs.existsSync(CLIENT_DIST)) {
  console.error('Error: client/dist does not exist. Run "npm run build -w client" first.');
  process.exit(1);
}

// 1. Copy server dist
console.log(`Copying ${SERVER_DIST} -> ${CLI_SERVER_TARGET}`);
fs.rmSync(CLI_SERVER_TARGET, { recursive: true, force: true });
fs.cpSync(SERVER_DIST, CLI_SERVER_TARGET, { recursive: true });

// 2. Copy client dist
console.log(`Copying ${CLIENT_DIST} -> ${CLI_CLIENT_TARGET}`);
fs.rmSync(CLI_CLIENT_TARGET, { recursive: true, force: true });
fs.cpSync(CLIENT_DIST, CLI_CLIENT_TARGET, { recursive: true });

console.log('✓ Standalone bundling complete!');
