#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const homeDir = os.homedir();
const shell = process.env.SHELL || '';
const isZsh = shell.endsWith('zsh') || fs.existsSync(path.join(homeDir, '.zshrc'));
const targetRc = isZsh ? path.join(homeDir, '.zshrc') : path.join(homeDir, '.bashrc');

const aliasSnippet = `
# Router7 CLI Aliases
alias router7='npx router7'
alias r7='router7'
`;

console.log('Setting up Router7 shell aliases...');

// 1. Link CLI locally if in monorepo
try {
  console.log('Linking local CLI package via npm link...');
  execSync('npm link -w cli', { stdio: 'inherit' });
  console.log('✓ Successfully linked router7 and r7 binaries globally.');
} catch (err) {
  console.warn('Notice: npm link could not run automatically:', err.message);
}

// 2. Append shell aliases if not present
if (fs.existsSync(targetRc)) {
  const content = fs.readFileSync(targetRc, 'utf8');
  if (content.includes("alias router7=") || content.includes("alias r7=")) {
    console.log(`✓ Shell aliases already exist in ${targetRc}`);
  } else {
    fs.appendFileSync(targetRc, aliasSnippet);
    console.log(`✓ Added router7 and r7 aliases to ${targetRc}`);
    console.log(`To apply in current session, run:\n  source ${targetRc}`);
  }
} else {
  // If neither exists, append to .profile
  const profilePath = path.join(homeDir, '.profile');
  fs.appendFileSync(profilePath, aliasSnippet);
  console.log(`✓ Added router7 and r7 aliases to ${profilePath}`);
}

console.log('\nRouter7 aliases are configured!');
console.log('You can now use:');
console.log('  router7 --help');
console.log('  r7 --help');
