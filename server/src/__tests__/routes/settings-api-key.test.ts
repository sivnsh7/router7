import { describe, it, expect, beforeAll } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../../app.js';
import { initDb, getUnifiedApiKey } from '../../db/index.js';
import { mintDashboardToken } from '../helpers/auth.js';

async function request(app: Express, method: string, path: string, body: any, token: string) {
  const server = app.listen(0, '127.0.0.1');
  if (!server.listening) await new Promise<void>(resolve => server.once('listening', () => resolve()));
  const addr = server.address() as any;
  const res = await fetch(`http://127.0.0.1:${addr.port}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await res.text();
  server.close();
  let json: any = null;
  try { json = JSON.parse(raw); } catch {}
  return { status: res.status, body: json };
}

describe('/api/settings/api-key', () => {
  let app: Express;
  let token: string;

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = '0'.repeat(64);
    initDb(':memory:');
    app = createApp();
    token = mintDashboardToken();
  });

  it('retrieves the active unified API key', async () => {
    const { status, body } = await request(app, 'GET', '/api/settings/api-key', undefined, token);
    expect(status).toBe(200);
    expect(body.apiKey).toBe(getUnifiedApiKey());
  });

  it('rejects keys shorter than 8 characters', async () => {
    const { status, body } = await request(app, 'PUT', '/api/settings/api-key', { apiKey: 'short' }, token);
    expect(status).toBe(400);
    expect(body.error).toContain('at least 8 characters');
  });

  it('rejects keys with invalid characters', async () => {
    const { status, body } = await request(app, 'PUT', '/api/settings/api-key', { apiKey: 'bad key with spaces\n' }, token);
    expect(status).toBe(400);
    expect(body.error).toContain('invalid characters');
  });

  it('updates the unified API key when a valid key is provided', async () => {
    const newCustomKey = 'router7-custom-test-key-12345';
    const { status, body } = await request(app, 'PUT', '/api/settings/api-key', { apiKey: newCustomKey }, token);
    expect(status).toBe(200);
    expect(body.apiKey).toBe(newCustomKey);
    expect(getUnifiedApiKey()).toBe(newCustomKey);
  });
});
