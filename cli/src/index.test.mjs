import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliEntry = path.resolve(__dirname, '../dist/index.js');

test('r7 --version prints version', async () => {
  const { stdout } = await execFileAsync(process.execPath, [cliEntry, '--version']);
  assert.match(stdout, /router7 v0\.8\.\d+/);
});

test('r7 --help prints usage for starting the GUI dashboard', async () => {
  const { stdout } = await execFileAsync(process.execPath, [cliEntry, '--help']);
  assert.match(stdout, /Router7 GUI — Intelligent Multi-Provider AI Gateway & Web GUI Dashboard/);
  assert.match(stdout, /Usage:/);
  assert.match(stdout, /--port/);
});
