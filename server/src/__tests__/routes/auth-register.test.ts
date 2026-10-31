import { describe, it, expect, beforeAll } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../../app.js';
import { initDb } from '../../db/index.js';

async function call(app: Express, method: string, path: string, body?: any, token?: string) {
  const server = app.listen(0, '127.0.0.1');
  if (!server.listening) await new Promise<void>(resolve => server.once('listening', () => resolve()));
  const addr = server.address() as any;
  const res = await fetch(`http://127.0.0.1:${addr.port}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  server.close();
  return { status: res.status, body: data };
}

describe('User Registration Endpoint (/api/auth/register)', () => {
  let app: Express;
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = '0'.repeat(64);
    initDb(':memory:');
    app = createApp();
  });

  it('rejects weak or malformed credentials', async () => {
    const badEmail = await call(app, 'POST', '/api/auth/register', { email: 'notanemail', password: 'password123' });
    expect(badEmail.status).toBe(400);

    const badPass = await call(app, 'POST', '/api/auth/register', { email: 'user@example.com', password: '123' });
    expect(badPass.status).toBe(400);
  });

  it('registers a new user and returns a valid session token', async () => {
    const res = await call(app, 'POST', '/api/auth/register', {
      email: 'newuser@example.com',
      password: 'strongpassword123',
    });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('newuser@example.com');
    expect(typeof res.body.token).toBe('string');

    // Token immediately grants access to gated endpoints
    const keysRes = await call(app, 'GET', '/api/keys', undefined, res.body.token);
    expect(keysRes.status).toBe(200);
  });

  it('rejects duplicate registration with email_taken (409)', async () => {
    const res = await call(app, 'POST', '/api/auth/register', {
      email: 'newuser@example.com',
      password: 'differentpassword123',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.type).toBe('email_taken');
  });

  it('allows registering additional distinct accounts', async () => {
    const res = await call(app, 'POST', '/api/auth/register', {
      email: 'seconduser@example.com',
      password: 'secondpassword123',
    });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('seconduser@example.com');
    expect(typeof res.body.token).toBe('string');
  });
});
