import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../../app.js';
import { initDb, getDb, getUnifiedApiKey } from '../../db/index.js';
import { mintDashboardToken } from '../helpers/auth.js';
import { encrypt } from '../../lib/crypto.js';
import { setCooldown, isOnCooldown } from '../../services/ratelimit.js';
import { once } from 'node:events';
import type { Server } from 'node:http';

describe('platform cooldown reset endpoint', () => {
  let server: Server;
  let baseUrl: string;
  let token: string;
  let keyId1: number;
  let keyId2: number;

  beforeAll(async () => {
    process.env.ENCRYPTION_KEY = '0'.repeat(64);
    initDb(':memory:');
    const db = getDb();

    // Create 2 keys for groq
    const sec1 = encrypt('groq-test-key-1');
    const sec2 = encrypt('groq-test-key-2');

    keyId1 = Number(db.prepare(`
      INSERT INTO api_keys (platform, encrypted_key, iv, auth_tag, enabled, status)
      VALUES ('groq', ?, ?, ?, 1, 'healthy')
    `).run(sec1.encrypted, sec1.iv, sec1.authTag).lastInsertRowid);

    keyId2 = Number(db.prepare(`
      INSERT INTO api_keys (platform, encrypted_key, iv, auth_tag, enabled, status)
      VALUES ('groq', ?, ?, ?, 1, 'healthy')
    `).run(sec2.encrypted, sec2.iv, sec2.authTag).lastInsertRowid);

    token = mintDashboardToken();
    const app = createApp();
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });

  afterAll(() => new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve())));

  it('clears cooldowns across all keys for a specific platform', async () => {
    // Put models on cooldown for both keys
    setCooldown('groq', 'llama-3.1-8b', keyId1, 60000);
    setCooldown('groq', 'llama-3.1-70b', keyId2, 60000);

    expect(isOnCooldown('groq', 'llama-3.1-8b', keyId1)).toBe(true);
    expect(isOnCooldown('groq', 'llama-3.1-70b', keyId2)).toBe(true);

    // Call DELETE /api/keys/platform/groq/cooldowns
    const res = await fetch(`${baseUrl}/api/keys/platform/groq/cooldowns`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const data = await res.json() as { cleared: number; keysCount: number };
    expect(data.cleared).toBe(2);
    expect(data.keysCount).toBe(2);

    // Verify both cooldowns are lifted
    expect(isOnCooldown('groq', 'llama-3.1-8b', keyId1)).toBe(false);
    expect(isOnCooldown('groq', 'llama-3.1-70b', keyId2)).toBe(false);
  });
});
