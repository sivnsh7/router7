#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const shScript = path.join(__dirname, 'setup-alias.sh');

if (fs.existsSync(shScript)) {
  try {
    execSync(`bash "${shScript}"`, { stdio: 'inherit' });
    process.exit(0);
  } catch {
    // Fall back to JavaScript setup if bash fails
  }
}

const homeDir = os.homedir();
const shell = process.env.SHELL || '';
const isZsh = shell.endsWith('zsh') || fs.existsSync(path.join(homeDir, '.zshrc'));
const targetRc = isZsh ? path.join(homeDir, '.zshrc') : path.join(homeDir, '.bashrc');

const aliasSnippet = `
# Router7 CLI Aliases
export PATH="$HOME/.local/bin:$PATH"
alias router7='npx -y router7'
alias r7='npx -y router7'
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

// 2. Setup ~/.local/bin wrapper
const localBin = path.join(homeDir, '.local', 'bin');
fs.mkdirSync(localBin, { recursive: true });
const wrapperContent = `#!/usr/bin/env bash
if [ -f "./cli/dist/index.js" ]; then
  exec node "./cli/dist/index.js" "$@"
fi
exec npx -y router7 "$@"
`;
const r7Path = path.join(localBin, 'r7');
fs.writeFileSync(r7Path, wrapperContent, { mode: 0o755 });
try {
  const router7Path = path.join(localBin, 'router7');
  if (fs.existsSync(router7Path)) fs.unlinkSync(router7Path);
  fs.symlinkSync(r7Path, router7Path);
} catch {
  // Ignore symlink failure
}

// 3. Append shell aliases if not present
if (fs.existsSync(targetRc)) {
  const content = fs.readFileSync(targetRc, 'utf8');
  if (content.includes("alias router7=") && content.includes("alias r7=")) {
    console.log(`✓ Shell aliases already exist in ${targetRc}`);
  } else {
    fs.appendFileSync(targetRc, aliasSnippet);
    console.log(`✓ Added router7 and r7 aliases to ${targetRc}`);
  }
} else {
  const profilePath = path.join(homeDir, '.profile');
  fs.appendFileSync(profilePath, aliasSnippet);
  console.log(`✓ Added router7 and r7 aliases to ${profilePath}`);
}

console.log('\n======================================================================');
console.log('  🎉 Setup Complete! You can run \'r7\' in terminal from now to start the tool.');
console.log('======================================================================');
console.log('\nYou can now start the server and open the dashboard with:');
console.log('  r7');
console.log('  router7');
