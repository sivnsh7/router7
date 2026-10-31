#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUTPUT_ZIP = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(ROOT, '..', 'router7-v4-alpha.zip');

console.log(`Packaging Router7 V4 release archive to: ${OUTPUT_ZIP}`);

if (existsSync(OUTPUT_ZIP)) {
  unlinkSync(OUTPUT_ZIP);
}

// Explicit exclusion list for security and hygiene (prefix with * so it matches folder paths)
const EXCLUDES = [
  '*server/data/*',
  '*server/data/.*',
  '*/data/*',
  '*/data/.*',
  '*.db',
  '*.db-wal',
  '*.db-shm',
  '*.bak',
  '*.encryption-key*',
  '*.env',
  '*.env.*',
  '*.local.json',
  '*node_modules/*',
  '*.git/*',
  '*.DS_Store',
  '*.tsbuildinfo',
];

const excludeArgs = EXCLUDES.map(x => `-x "${x}"`).join(' ');

// Run zip command from root's parent directory
const parentDir = resolve(ROOT, '..');
const folderName = 'router7-v4-alpha';

const zipCmd = `cd "${parentDir}" && zip -r -q "${OUTPUT_ZIP}" "${folderName}" ${excludeArgs}`;
console.log('Creating ZIP archive...');
execSync(zipCmd, { stdio: 'inherit' });

console.log('Verifying archive hygiene and security allowlist...');
const listing = execSync(`unzip -l "${OUTPUT_ZIP}"`, { encoding: 'utf8' });

const FORBIDDEN_PATTERNS = [
  /server\/data\/router7\.db/,
  /\.encryption-key/,
  /\.db-wal/,
  /\.db-shm/,
  /\.env(\.|$)/,
  /\.claude\/settings\.local\.json/,
  /node_modules\//,
];

let failed = false;
for (const line of listing.split('\n')) {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(line)) {
      console.error(`SECURITY VIOLATION: Forbidden entry found in archive: ${line.trim()}`);
      failed = true;
    }
  }
}

if (failed) {
  unlinkSync(OUTPUT_ZIP);
  console.error('Packaging failed security verification! Output archive deleted.');
  process.exit(1);
}

console.log('Archive packaging and security verification SUCCEEDED.');
