import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../../app.js';
import { initDb, getDb } from '../../db/index.js';
import { mintDashboardToken, isGatedApiPath } from '../helpers/auth.js';
import { encrypt } from '../../lib/crypto.js';

const realFetch = globalThis.fetch;
let dashToken = '';

async function request(app: Express, method: string, path: string, body?: unknown, auth = true) {
  const server = app.listen(0, '127.0.0.1');
  if (!server.listening) await new Promise<void>(resolve => server.once('listening', () => resolve()));
  const addr = server.address() as any;
  const res = await realFetch(`http://127.0.0.1:${addr.port}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth && isGatedApiPath(path) ? { Authorization: `Bearer ${dashToken}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await res.json().catch(() => null);
  server.close();
  return { status: res.status, body: data as any };
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function insertKey(platform: string, key = 'sk-test-secret', baseUrl?: string) {
  const enc = encrypt(key);
  const result = getDb().prepare(`
    INSERT INTO api_keys (platform, label, encrypted_key, iv, auth_tag, status, enabled, base_url)
    VALUES (?, 'test', ?, ?, ?, 'healthy', 1, ?)
  `).run(platform, enc.encrypted, enc.iv, enc.authTag, baseUrl ?? null);
  return Number(result.lastInsertRowid);
}

describe('Provider Model Endpoint Sync & Auto-Update (#provider-registry)', () => {
  let app: Express;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = '0'.repeat(64);
    initDb(':memory:');
    app = createApp();
    dashToken = mintDashboardToken();
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it('rejects fetch-models when provider has no active keys', async () => {
    const { status, body } = await request(app, 'POST', '/api/keys/fetch-models', { platform: 'groq' });
    expect(status).toBe(400);
    expect(body.error.message).toContain('No active key configured');
  });

  it('fetches and updates models for an OpenAI-compatible provider', async () => {
    const keyId = insertKey('groq', 'gsk-valid-key');

    // Stub upstream /models response with one new model and one seeded model
    const mock = vi.fn(async () => jsonResponse({
      object: 'list',
      data: [
        { id: 'llama-3.3-70b-versatile', context_window: 131072 },
        { id: 'llama-4-preview-next', context_window: 128000, vision: true },
      ],
    }));
    globalThis.fetch = mock as any;

    const { status, body } = await request(app, 'POST', '/api/keys/fetch-models', { platform: 'groq', keyId });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.platform).toBe('groq');
    expect(body.totalDiscovered).toBe(2);
    expect(body.addedCount).toBe(1); // llama-4-preview-next
    expect(body.existingCount).toBe(1); // llama-3.3-70b-versatile was already up to date
    expect(body.addedModels).toEqual(['llama-4-preview-next']);

    // Check models were added to database
    const db = getDb();
    const rows = db.prepare("SELECT model_id, supports_vision, context_window FROM models WHERE platform = 'groq'").all() as any[];
    const visionModel = rows.find(r => r.model_id === 'llama-4-preview-next');
    expect(visionModel).toBeDefined();
    expect(visionModel.supports_vision).toBe(1);
    expect(visionModel.context_window).toBe(128000);

    // Run again with enriched metadata to verify non-destructive update
    const mock2 = vi.fn(async () => jsonResponse({
      data: [
        { id: 'llama-3.3-70b-versatile', context_window: 131072, vision: true },
        { id: 'llama-4-preview-next', context_window: 128000 },
        { id: 'new-model-3', context_window: 32000 },
      ],
    }));
    globalThis.fetch = mock2 as any;

    const res2 = await request(app, 'POST', '/api/keys/fetch-models', { platform: 'groq', keyId });
    expect(res2.status).toBe(200);
    expect(res2.body.addedCount).toBe(1); // new-model-3
    expect(res2.body.updatedCount).toBe(1); // llama-3.3-70b-versatile gained vision
    expect(res2.body.existingCount).toBe(1); // llama-4-preview-next was untouched
  });

  it('fetches and registers models for a custom endpoint', async () => {
    const keyId = insertKey('custom', 'sk-custom', 'http://127.0.0.1:9099/v1');

    const mock = vi.fn(async () => jsonResponse({
      data: [
        { id: 'qwen-2.5-coder-32b', context_length: 65536 },
      ],
    }));
    globalThis.fetch = mock as any;

    const { status, body } = await request(app, 'POST', '/api/keys/fetch-models', { platform: 'custom', keyId });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.totalDiscovered).toBe(1);
    expect(body.addedCount).toBe(1);

    const row = getDb().prepare("SELECT model_id, context_window FROM models WHERE platform = 'custom'").get() as any;
    expect(row.model_id).toBe('qwen-2.5-coder-32b');
    expect(row.context_window).toBe(65536);
  });

  it('manages auto-sync setting for a provider', async () => {
    // 1. Initial status is false
    const getRes1 = await request(app, 'GET', '/api/keys/auto-sync/groq');
    expect(getRes1.status).toBe(200);
    expect(getRes1.body.enabled).toBe(false);

    // 2. Enable auto-sync
    const postRes = await request(app, 'POST', '/api/keys/auto-sync/groq', { enabled: true });
    expect(postRes.status).toBe(200);
    expect(postRes.body.enabled).toBe(true);

    // 3. Status is now true
    const getRes2 = await request(app, 'GET', '/api/keys/auto-sync/groq');
    expect(getRes2.status).toBe(200);
    expect(getRes2.body.enabled).toBe(true);

    // 4. Disable auto-sync
    await request(app, 'POST', '/api/keys/auto-sync/groq', { enabled: false });
    const getRes3 = await request(app, 'GET', '/api/keys/auto-sync/groq');
    expect(getRes3.body.enabled).toBe(false);
  });
});
