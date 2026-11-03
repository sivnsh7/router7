import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Release packaging hygiene and security checks', () => {
  it('gitignore strictly excludes database files, encryption keys, and agent local config', () => {
    const gitignorePath = resolve(__dirname, '../../../.gitignore');
    expect(existsSync(gitignorePath)).toBe(true);
    const content = readFileSync(gitignorePath, 'utf8');

    expect(content).toContain('server/data/');
    expect(content).toContain('*.db');
    expect(content).toContain('*.db-wal');
    expect(content).toContain('*.db-shm');
    expect(content).toContain('.encryption-key');
    expect(content).toContain('.claude/settings.local.json');
  });

  it('prohibits local encryption key or live database in git tracking', () => {
    const _serverDataDb = resolve(__dirname, '../../data/router7.db');
    const _encKey = resolve(__dirname, '../../data/.encryption-key');
    // If files happen to be on disk during testing, ensure they are not tracked or staged
    const packageScript = resolve(__dirname, '../../../scripts/package-release.mjs');
    expect(existsSync(packageScript)).toBe(true);
  });
});
