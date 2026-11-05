import { describe, it, expect, beforeEach } from 'vitest';
import { connectDb, getDb } from '../../db/index.js';
import { decrypt, initEncryptionKey } from '../../lib/crypto.js';
import {
  getSupportedOAuthProviders,
  initiateDeviceCode,
  pollDeviceToken,
  simulateDeviceApprove,
  generatePkceAuth,
  exchangeAuthCode,
  refreshOAuthToken,
  isOAuthPlatform,
  saveOAuthCredential,
  ensureValidToken,
} from '../../services/oauth.js';

describe('OAuth Providers Algorithm & Service', () => {
  beforeEach(() => {
    connectDb(':memory:');
    getDb().exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        label TEXT NOT NULL DEFAULT '',
        encrypted_key TEXT NOT NULL,
        iv TEXT NOT NULL,
        auth_tag TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'unknown',
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_checked_at TEXT
      );
      CREATE TABLE IF NOT EXISTS models (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        model_id TEXT NOT NULL,
        display_name TEXT NOT NULL,
        intelligence_rank INTEGER NOT NULL DEFAULT 5,
        speed_rank INTEGER NOT NULL DEFAULT 5,
        size_label TEXT NOT NULL DEFAULT '',
        rpm_limit INTEGER,
        rpd_limit INTEGER,
        tpm_limit INTEGER,
        tpd_limit INTEGER,
        monthly_token_budget TEXT NOT NULL DEFAULT '',
        context_window INTEGER,
        enabled INTEGER NOT NULL DEFAULT 1,
        supports_vision INTEGER NOT NULL DEFAULT 0,
        UNIQUE(platform, model_id)
      );
    `);
    initEncryptionKey(getDb());
  });

  it('lists all supported OAuth providers with proper metadata', () => {
    const providers = getSupportedOAuthProviders();
    expect(providers.length).toBeGreaterThanOrEqual(4);
    const platforms = providers.map(p => p.platform);
    expect(platforms).toContain('antigravity');
    expect(platforms).toContain('copilot');
    expect(platforms).toContain('codex');
    expect(platforms).toContain('openreference');

    for (const p of providers) {
      expect(p.name).toBeDefined();
      expect(p.authUrl).toMatch(/^https:\/\//);
      expect(p.deviceCodeUrl).toMatch(/^https:\/\//);
      expect(p.tokenUrl).toMatch(/^https:\/\//);
      expect(p.scopes.length).toBeGreaterThan(0);
      expect(p.supportsDeviceFlow).toBe(true);
      expect(isOAuthPlatform(p.platform)).toBe(true);
    }
  });

  it('initiates RFC 8628 device flow with user code and verification uri', async () => {
    const init = await initiateDeviceCode('copilot');
    expect(init.platform).toBe('copilot');
    expect(init.deviceCode).toBeTruthy();
    expect(init.userCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(init.verificationUri).toContain('github.com');
    expect(init.expiresIn).toBeGreaterThan(0);
    expect(init.interval).toBeGreaterThanOrEqual(3);
  });

  it('polls device flow returning pending, then authorized after approval', async () => {
    const init = await initiateDeviceCode('antigravity');
    
    // Poll initially - pending
    const poll1 = await pollDeviceToken('antigravity', init.deviceCode);
    expect(poll1.status).toBe('pending');
    expect(poll1.keyId).toBeUndefined();

    // Approve the device code
    const approved = simulateDeviceApprove(init.deviceCode, {
      access_token: 'ag_oauth_token_1234567890abcdef',
      refresh_token: 'ag_refresh_token_abcdef1234567890',
    });
    expect(approved).toBe(true);

    // Poll again - authorized
    const poll2 = await pollDeviceToken('antigravity', init.deviceCode, 'My Antigravity Key');
    expect(poll2.status).toBe('authorized');
    expect(poll2.keyId).toBeDefined();
    expect(poll2.platform).toBe('antigravity');
    expect(poll2.maskedToken).toBe('ag_o...cdef');

    // Verify key was saved into api_keys table
    const db = getDb();
    const row = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(poll2.keyId) as any;
    expect(row).toBeDefined();
    expect(row.platform).toBe('antigravity');
    expect(row.label).toBe('My Antigravity Key');

    const decrypted = decrypt(row.encrypted_key, row.iv, row.auth_tag);
    const bundle = JSON.parse(decrypted);
    expect(bundle.access_token).toBe('ag_oauth_token_1234567890abcdef');
    expect(bundle.refresh_token).toBe('ag_refresh_token_abcdef1234567890');
  });

  it('refreshes an OAuth token and updates the database row', async () => {
    const saved = saveOAuthCredential('codex', {
      token_type: 'Bearer',
      access_token: 'cdx_initial_access_token_1234',
      refresh_token: 'refresh_mock_token_9999',
      expires_at: Date.now() + 1000,
      scope: 'model.request',
    });

    const refreshResult = await refreshOAuthToken(saved.id);
    expect(refreshResult.success).toBe(true);
    expect(refreshResult.refreshedAt).toBeDefined();

    // Verify the db was updated
    const db = getDb();
    const row = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(saved.id) as any;
    const decrypted = decrypt(row.encrypted_key, row.iv, row.auth_tag);
    const bundle = JSON.parse(decrypted);
    expect(bundle.access_token).toContain('access_refreshed_');
    expect(bundle.refresh_token).toBe('refresh_mock_token_9999');
  });

  it('ensureValidToken returns access_token directly or auto-refreshes if expiring', async () => {
    // Normal non-JSON key returns as-is
    const rawKey = await ensureValidToken(1, 'plain-api-key-1234');
    expect(rawKey).toBe('plain-api-key-1234');

    // Fresh token bundle returns its access_token
    const freshBundle = JSON.stringify({
      access_token: 'fresh_token_xyz',
      expires_at: Date.now() + 3600 * 1000,
    });
    const freshToken = await ensureValidToken(1, freshBundle);
    expect(freshToken).toBe('fresh_token_xyz');

    // Expired token auto-refreshes
    const saved = saveOAuthCredential('openreference', {
      token_type: 'Bearer',
      access_token: 'stale_token_abc',
      refresh_token: 'refresh_stale_123',
      expires_at: Date.now() - 5000, // expired
    });
    const staleBundle = JSON.stringify({
      access_token: 'stale_token_abc',
      refresh_token: 'refresh_stale_123',
      expires_at: Date.now() - 5000,
    });
    const refreshedToken = await ensureValidToken(saved.id, staleBundle);
    expect(refreshedToken).toContain('access_refreshed_');
  });

  it('generates PKCE authorization URL with state, code_challenge and code_verifier', () => {
    const pkce = generatePkceAuth('copilot', 'http://localhost:3001/oauth/callback');
    expect(pkce.authUrl).toContain('github.com/login/oauth/authorize');
    expect(pkce.authUrl).toContain('code_challenge=');
    expect(pkce.authUrl).toContain('code_challenge_method=S256');
    expect(pkce.state).toBeTruthy();
    expect(pkce.codeVerifier).toBeTruthy();
  });

  it('exchanges auth code for tokens and saves into database', async () => {
    const exchanged = await exchangeAuthCode(
      'openreference',
      'test_code_12345',
      'verifier_12345',
      'http://localhost:3001/callback',
      'OpenRef OAuth',
    );
    expect(exchanged.success).toBe(true);
    expect(exchanged.keyId).toBeDefined();
    expect(exchanged.platform).toBe('openreference');

    const db = getDb();
    const row = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(exchanged.keyId) as any;
    expect(row).toBeDefined();
    expect(row.label).toBe('OpenRef OAuth');
  });
});
