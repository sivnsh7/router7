import { describe, it, expect, beforeEach } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../../app.js';
import { initDb } from '../../db/index.js';
import { mintDashboardToken } from '../helpers/auth.js';

let dashToken = '';

async function request(app: Express, method: string, path: string, body?: any) {
  const server = app.listen(0, '127.0.0.1');
  if (!server.listening) await new Promise<void>(resolve => server.once('listening', () => resolve()));
  const addr = server.address() as any;
  const url = `http://127.0.0.1:${addr.port}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${dashToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  server.close();
  return { status: res.status, body: data };
}

describe('OAuth Routes Integration', () => {
  let app: Express;

  beforeEach(async () => {
    initDb(':memory:');
    dashToken = mintDashboardToken();
    app = createApp();
  });

  it('GET /api/oauth/providers returns list of OAuth providers', async () => {
    const res = await request(app, 'GET', '/api/oauth/providers');

    expect(res.status).toBe(200);
    expect(res.body.providers).toBeDefined();
    expect(Array.isArray(res.body.providers)).toBe(true);
    const platforms = res.body.providers.map((p: any) => p.platform);
    expect(platforms).toContain('copilot');
    expect(platforms).toContain('antigravity');
    expect(platforms).toContain('codex');
    expect(platforms).toContain('openreference');
  });

  it('full device flow: initiate -> poll pending -> simulate approve -> poll authorized', async () => {
    // 1. Initiate
    const initRes = await request(app, 'POST', '/api/oauth/device/initiate', { platform: 'copilot' });

    expect(initRes.status).toBe(200);
    expect(initRes.body.deviceCode).toBeTruthy();
    expect(initRes.body.userCode).toBeTruthy();
    expect(initRes.body.verificationUri).toBeTruthy();

    const deviceCode = initRes.body.deviceCode;

    // 2. Poll initial - pending
    const pollPending = await request(app, 'POST', '/api/oauth/device/poll', { platform: 'copilot', deviceCode });

    expect(pollPending.status).toBe(200);
    expect(pollPending.body.status).toBe('pending');

    // 3. Simulate approve
    const approveRes = await request(app, 'POST', '/api/oauth/device/simulate-approve', {
      deviceCode,
      accessToken: 'gho_copilot_test_access_token_123',
    });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);

    // 4. Poll again - authorized
    const pollAuth = await request(app, 'POST', '/api/oauth/device/poll', {
      platform: 'copilot',
      deviceCode,
      label: 'Copilot Dev',
    });

    expect(pollAuth.status).toBe(200);
    expect(pollAuth.body.status).toBe('authorized');
    expect(pollAuth.body.keyId).toBeDefined();
    expect(pollAuth.body.platform).toBe('copilot');
    expect(pollAuth.body.maskedToken).toBeTruthy();

    // 5. Check key shows up on GET /api/keys
    const keysRes = await request(app, 'GET', '/api/keys');
    expect(keysRes.status).toBe(200);
    const copilotKey = keysRes.body.find((k: any) => k.platform === 'copilot');
    expect(copilotKey).toBeDefined();
    expect(copilotKey.label).toBe('Copilot Dev');
  });

  it('PKCE flow: initiate -> exchange code', async () => {
    const initRes = await request(app, 'POST', '/api/oauth/pkce/initiate', {
      platform: 'openreference',
      redirectUri: 'http://localhost:3001/callback',
    });

    expect(initRes.status).toBe(200);
    expect(initRes.body.authUrl).toContain('openreference.ai');
    expect(initRes.body.codeVerifier).toBeTruthy();
    expect(initRes.body.state).toBeTruthy();

    const exchangeRes = await request(app, 'POST', '/api/oauth/pkce/exchange', {
      platform: 'openreference',
      code: 'test_auth_code_pkce',
      codeVerifier: initRes.body.codeVerifier,
      redirectUri: 'http://localhost:3001/callback',
      label: 'OpenRef PKCE Key',
    });

    expect(exchangeRes.status).toBe(200);
    expect(exchangeRes.body.success).toBe(true);
    expect(exchangeRes.body.keyId).toBeDefined();
    expect(exchangeRes.body.platform).toBe('openreference');
  });

  it('token refresh endpoint /api/oauth/token/refresh rotates stored token', async () => {
    // Initiate and approve with a refresh token
    const initRes = await request(app, 'POST', '/api/oauth/device/initiate', { platform: 'antigravity' });

    await request(app, 'POST', '/api/oauth/device/simulate-approve', {
      deviceCode: initRes.body.deviceCode,
      accessToken: 'initial_ag_access',
      refreshToken: 'refresh_ag_refr',
    });

    const pollRes = await request(app, 'POST', '/api/oauth/device/poll', {
      platform: 'antigravity',
      deviceCode: initRes.body.deviceCode,
    });

    const keyId = pollRes.body.keyId;

    // Call refresh
    const refreshRes = await request(app, 'POST', '/api/oauth/token/refresh', { keyId });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.refreshedAt).toBeDefined();
  });
});
