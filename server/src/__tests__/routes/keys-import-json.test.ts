import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../../app.js';
import { initDb, getDb } from '../../db/index.js';
import { encrypt, decrypt, initEncryptionKey } from '../../lib/crypto.js';
import { mintDashboardToken } from '../helpers/auth.js';

let dashToken = '';
let app: Express;

async function requestApi(
  path: string,
  options: { method?: string; body?: any; headers?: Record<string, string> } = {},
) {
  const server = app.listen(0, '127.0.0.1');
  if (!server.listening) {
    await new Promise<void>(resolve => server.once('listening', () => resolve()));
  }
  const addr = server.address() as { port: number };
  const headers: Record<string, string> = {
    Authorization: `Bearer ${dashToken}`,
    ...options.headers,
  };
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`http://127.0.0.1:${addr.port}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => null);
  server.close();
  return { status: res.status, data };
}

function insertTestKey(platform: string, raw: string, label: string, modelScope: string[] | null = null) {
  const { encrypted, iv, authTag } = encrypt(raw);
  const scopeJson = modelScope ? JSON.stringify(modelScope) : null;
  getDb().prepare(`
    INSERT INTO api_keys (platform, label, encrypted_key, iv, auth_tag, status, enabled, model_scope_json)
    VALUES (?, ?, ?, ?, ?, 'healthy', 1, ?)
  `).run(platform, label, encrypted, iv, authTag, scopeJson);
}

describe('POST /api/keys/import-json and GET /api/keys/export roundtrip', () => {
  beforeAll(async () => {
    initDb(':memory:');
    initEncryptionKey(getDb());
    dashToken = mintDashboardToken();
    app = createApp();
  });

  beforeEach(() => {
    getDb().prepare('DELETE FROM api_keys').run();
  });

  it('imports valid JSON array of keys successfully', async () => {
    const res = await requestApi('/api/keys/import-json', {
      method: 'POST',
      body: {
        keys: [
          { platform: 'google', key: 'AIzaSyTest123', label: 'Gemini Primary' },
          { platform: 'groq', key: 'gsk_Test456', label: 'Groq Fast' },
        ],
        collisionStrategy: 'skip',
      },
    });

    expect(res.status).toBe(200);
    expect(res.data.imported).toBe(2);
    expect(res.data.updated).toBe(0);
    expect(res.data.skipped).toEqual([]);
    expect(res.data.errors).toEqual([]);

    const dbRows = getDb().prepare('SELECT platform, label, encrypted_key, iv, auth_tag FROM api_keys').all() as any[];
    expect(dbRows).toHaveLength(2);
    expect(dbRows.map(r => r.platform)).toContain('google');
    expect(dbRows.map(r => r.platform)).toContain('groq');
  });

  it('imports raw jsonContent string containing an export envelope with modelScope', async () => {
    const jsonString = JSON.stringify({
      version: 1,
      source: 'router7',
      keys: [
        {
          platform: 'mistral',
          key: 'mis_Secret123',
          label: 'Mistral Large',
          modelScope: ['mistral-large-latest'],
        },
      ],
    });

    const res = await requestApi('/api/keys/import-json', {
      method: 'POST',
      body: {
        jsonContent: jsonString,
        collisionStrategy: 'skip',
      },
    });

    expect(res.status).toBe(200);
    expect(res.data.imported).toBe(1);

    const row = getDb().prepare('SELECT * FROM api_keys WHERE platform = ?').get('mistral') as any;
    expect(row).toBeDefined();
    expect(row.label).toBe('Mistral Large');
    expect(JSON.parse(row.model_scope_json)).toEqual(['mistral-large-latest']);
    expect(decrypt(row.encrypted_key, row.iv, row.auth_tag)).toBe('mis_Secret123');
  });

  it('handles collisionStrategy: skip when duplicate key already exists', async () => {
    insertTestKey('google', 'AIzaDuplicateKey', 'Existing Google Key');

    const res = await requestApi('/api/keys/import-json', {
      method: 'POST',
      body: {
        keys: [
          { platform: 'google', key: 'AIzaDuplicateKey', label: 'New Google Key' },
          { platform: 'groq', key: 'gsk_UniqueGroq', label: 'Unique Groq' },
        ],
        collisionStrategy: 'skip',
      },
    });

    expect(res.status).toBe(200);
    expect(res.data.imported).toBe(1);
    expect(res.data.updated).toBe(0);
    expect(res.data.skipped).toHaveLength(1);
    expect(res.data.skipped[0]).toBe('New Google Key');

    const rows = getDb().prepare('SELECT label FROM api_keys WHERE platform = ?').all('google') as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe('Existing Google Key');
  });

  it('handles collisionStrategy: overwrite by updating existing row label and modelScope', async () => {
    insertTestKey('google', 'AIzaDuplicateKey', 'Old Google Label');

    const res = await requestApi('/api/keys/import-json', {
      method: 'POST',
      body: {
        keys: [
          {
            platform: 'google',
            key: 'AIzaDuplicateKey',
            label: 'Updated Google Label',
            modelScope: ['gemini-2.5-pro'],
          },
        ],
        collisionStrategy: 'overwrite',
      },
    });

    expect(res.status).toBe(200);
    expect(res.data.imported).toBe(0);
    expect(res.data.updated).toBe(1);

    const row = getDb().prepare('SELECT * FROM api_keys WHERE platform = ?').get('google') as any;
    expect(row.label).toBe('Updated Google Label');
    expect(JSON.parse(row.model_scope_json)).toEqual(['gemini-2.5-pro']);
  });

  it('handles collisionStrategy: keep_both by inserting duplicate with adjusted label', async () => {
    insertTestKey('cerebras', 'csk_SharedKey123', 'Cerebras Prod');

    const res = await requestApi('/api/keys/import-json', {
      method: 'POST',
      body: {
        keys: [
          { platform: 'cerebras', key: 'csk_SharedKey123', label: 'Cerebras Prod' },
        ],
        collisionStrategy: 'keep_both',
      },
    });

    expect(res.status).toBe(200);
    expect(res.data.imported).toBe(1);
    expect(res.data.updated).toBe(0);

    const rows = getDb().prepare('SELECT label FROM api_keys WHERE platform = ? ORDER BY id ASC').all('cerebras') as any[];
    expect(rows).toHaveLength(2);
    expect(rows[0].label).toBe('Cerebras Prod');
    expect(rows[1].label).toBe('Cerebras Prod (imported)');
  });

  it('exports keys including modelScope and allows re-importing cleanly', async () => {
    insertTestKey('cohere', 'coh_Test123', 'Cohere Command', ['command-r-plus']);

    const exportRes = await requestApi('/api/keys/export?format=json', {
      headers: { 'x-reauth-password': 'password123' },
    });
    expect(exportRes.status).toBe(200);
    expect(exportRes.data.keys).toHaveLength(1);
    expect(exportRes.data.keys[0].platform).toBe('cohere');
    expect(exportRes.data.keys[0].key).toBe('coh_Test123');
    expect(exportRes.data.keys[0].modelScope).toEqual(['command-r-plus']);

    // Wipe DB and re-import
    getDb().prepare('DELETE FROM api_keys').run();

    const importRes = await requestApi('/api/keys/import-json', {
      method: 'POST',
      body: {
        keys: exportRes.data.keys,
        collisionStrategy: 'skip',
      },
    });

    expect(importRes.status).toBe(200);
    expect(importRes.data.imported).toBe(1);

    const restored = getDb().prepare('SELECT * FROM api_keys WHERE platform = ?').get('cohere') as any;
    expect(restored.label).toBe('Cohere Command');
    expect(JSON.parse(restored.model_scope_json)).toEqual(['command-r-plus']);
  });

  it('returns errors for unsupported platform or missing key', async () => {
    const res = await requestApi('/api/keys/import-json', {
      method: 'POST',
      body: {
        keys: [
          { platform: 'not_a_real_provider', key: 'abc', label: 'Fake' },
          { platform: 'groq', key: '', label: 'Empty Groq' },
        ],
        collisionStrategy: 'skip',
      },
    });

    expect(res.status).toBe(200);
    expect(res.data.imported).toBe(0);
    expect(res.data.errors).toHaveLength(2);
    expect(res.data.errors[0].error).toContain('Unsupported platform');
    expect(res.data.errors[1].error).toContain('keyValue must be at least 1 character');
  });

  it('safely imports structured object keys (such as OAuth bundles) without crashing', async () => {
    const res = await requestApi('/api/keys/import-json', {
      method: 'POST',
      body: {
        keys: [
          {
            platform: 'copilot',
            key: {
              access_token: 'gho_ObjectToken12345',
              token_type: 'Bearer',
              refresh_token: 'refr_ObjectToken98765',
            },
            label: 'Copilot Object Key',
          },
        ],
        collisionStrategy: 'skip',
      },
    });

    expect(res.status).toBe(200);
    expect(res.data.imported).toBe(1);
    expect(res.data.errors).toHaveLength(0);

    const row = getDb().prepare('SELECT * FROM api_keys WHERE platform = ?').get('copilot') as any;
    expect(row).toBeDefined();
    expect(row.label).toBe('Copilot Object Key');
    const decrypted = decrypt(row.encrypted_key, row.iv, row.auth_tag);
    const parsed = JSON.parse(decrypted);
    expect(parsed.access_token).toBe('gho_ObjectToken12345');
    expect(parsed.token_type).toBe('Bearer');
  });

  it('imports keyless platform with empty key storing no-key sentinel', async () => {
    const res = await requestApi('/api/keys/import-json', {
      method: 'POST',
      body: {
        keys: [
          { platform: 'kilo', key: '', label: 'Anonymous Kilo' },
        ],
        collisionStrategy: 'skip',
      },
    });

    expect(res.status).toBe(200);
    expect(res.data.imported).toBe(1);
    expect(res.data.errors).toHaveLength(0);

    const row = getDb().prepare('SELECT * FROM api_keys WHERE platform = ?').get('kilo') as any;
    expect(row).toBeDefined();
    expect(decrypt(row.encrypted_key, row.iv, row.auth_tag)).toBe('no-key');
  });

  it('registers models accompanying custom endpoints and returns modelsRegistered', async () => {
    const res = await requestApi('/api/keys/import-json', {
      method: 'POST',
      body: {
        keys: [
          {
            platform: 'custom',
            baseUrl: 'https://api.custom-ai-test.com/v1',
            key: 'sk-custom-secret-key',
            label: 'Custom Local LLM',
            models: [
              { id: 'custom-llama-3-8b', supportsTools: true, supportsVision: false },
              { id: 'custom-embed-small' },
            ],
          },
        ],
        collisionStrategy: 'skip',
      },
    });

    expect(res.status).toBe(200);
    expect(res.data.imported).toBe(1);
    expect(res.data.modelsRegistered).toBeGreaterThanOrEqual(1);

    const row = getDb().prepare('SELECT * FROM api_keys WHERE platform = ?').get('custom') as any;
    expect(row).toBeDefined();
    expect(row.base_url).toBe('https://api.custom-ai-test.com/v1');

    const modelRow = getDb().prepare('SELECT * FROM models WHERE model_id = ?').get('custom-llama-3-8b') as any;
    expect(modelRow).toBeDefined();
    expect(modelRow.platform).toBe('custom');
  });
});
