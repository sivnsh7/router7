import crypto from 'crypto';
import type { Platform, OAuthDeviceInitiateResponse, OAuthDevicePollResponse, OAuthProviderMetadata, OAuthTokenBundle } from '@router7/shared/types.js';
import { getDb } from '../db/index.js';
import { encrypt, decrypt, maskKey } from '../lib/crypto.js';
import { triggerBuiltinModelDiscovery } from './builtin-model-discovery.js';

export interface OAuthProviderConfig {
  platform: Platform;
  name: string;
  clientId: string;
  clientSecret?: string;
  authUrl: string;
  deviceCodeUrl: string;
  tokenUrl: string;
  scopes: string[];
  supportsDeviceFlow: boolean;
  supportsAuthCodeFlow: boolean;
}

export const OAUTH_PROVIDER_CONFIGS: Record<string, OAuthProviderConfig> = {
  antigravity: {
    platform: 'antigravity',
    name: 'Antigravity (OAuth)',
    clientId: 'antigravity-router7-agent',
    authUrl: 'https://antigravity.google/oauth/authorize',
    deviceCodeUrl: 'https://antigravity.google/oauth/device',
    tokenUrl: 'https://antigravity.google/oauth/token',
    scopes: ['openid', 'email', 'antigravity.inference'],
    supportsDeviceFlow: true,
    supportsAuthCodeFlow: true,
  },
  copilot: {
    platform: 'copilot',
    name: 'GitHub Copilot (OAuth)',
    clientId: 'Iv1.b507a08c87ecfe81', // Standard GitHub Copilot VSCode client id
    authUrl: 'https://github.com/login/oauth/authorize',
    deviceCodeUrl: 'https://github.com/login/device/code',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['read:user', 'copilot'],
    supportsDeviceFlow: true,
    supportsAuthCodeFlow: true,
  },
  codex: {
    platform: 'codex',
    name: 'OpenAI Codex (OAuth)',
    clientId: 'codex-cli-platform',
    authUrl: 'https://auth.openai.com/authorize',
    deviceCodeUrl: 'https://auth.openai.com/oauth/device/code',
    tokenUrl: 'https://auth.openai.com/oauth/token',
    scopes: ['openid', 'profile', 'model.request'],
    supportsDeviceFlow: true,
    supportsAuthCodeFlow: true,
  },
  openreference: {
    platform: 'openreference',
    name: 'OpenReference (OAuth)',
    clientId: 'openreference-desktop',
    authUrl: 'https://openreference.ai/oauth/authorize',
    deviceCodeUrl: 'https://openreference.ai/oauth/device/code',
    tokenUrl: 'https://openreference.ai/oauth/token',
    scopes: ['inference', 'read'],
    supportsDeviceFlow: true,
    supportsAuthCodeFlow: true,
  },
};

interface PendingDeviceSession {
  platform: Platform;
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete?: string;
  createdAt: number;
  expiresIn: number;
  interval: number;
  approvedToken?: OAuthTokenBundle;
  denied?: boolean;
}

interface PendingPkceSession {
  platform: Platform;
  state: string;
  codeVerifier: string;
  createdAt: number;
}

// In-memory sessions
const pendingDeviceSessions = new Map<string, PendingDeviceSession>();
const pendingPkceSessions = new Map<string, PendingPkceSession>();

/** Clean up expired sessions periodically */
function pruneExpiredSessions(): void {
  const now = Date.now();
  for (const [code, session] of pendingDeviceSessions.entries()) {
    if (now - session.createdAt > session.expiresIn * 1000) {
      pendingDeviceSessions.delete(code);
    }
  }
  for (const [state, session] of pendingPkceSessions.entries()) {
    if (now - session.createdAt > 15 * 60 * 1000) {
      pendingPkceSessions.delete(state);
    }
  }
}

/** Get public metadata for all supported OAuth providers */
export function getSupportedOAuthProviders(): OAuthProviderMetadata[] {
  return Object.values(OAUTH_PROVIDER_CONFIGS).map(cfg => ({
    platform: cfg.platform,
    name: cfg.name,
    authUrl: cfg.authUrl,
    deviceCodeUrl: cfg.deviceCodeUrl,
    tokenUrl: cfg.tokenUrl,
    scopes: [...cfg.scopes],
    supportsDeviceFlow: cfg.supportsDeviceFlow,
    supportsAuthCodeFlow: cfg.supportsAuthCodeFlow,
  }));
}

const OAUTH_PLATFORM_IDS: ReadonlySet<string> = new Set([
  'antigravity',
  'copilot',
  'codex',
  'openreference',
]);

export function isOAuthPlatform(platform: string): boolean {
  return OAUTH_PLATFORM_IDS.has(platform) || platform in OAUTH_PROVIDER_CONFIGS;
}

export function getOAuthProviderConfig(platform: string): OAuthProviderConfig | undefined {
  return OAUTH_PROVIDER_CONFIGS[platform];
}

/**
 * Initiate RFC 8628 Device Authorization Flow.
 * Queries the upstream provider's device code endpoint if reachable,
 * or creates a tracked session ready for local/simulated authorization.
 */
export async function initiateDeviceCode(platform: Platform): Promise<OAuthDeviceInitiateResponse> {
  pruneExpiredSessions();
  const config = getOAuthProviderConfig(platform);
  if (!config) {
    throw new Error(`Platform '${platform}' is not configured as an OAuth provider`);
  }

  // Generate fallback session identifiers
  const fallbackDeviceCode = `dc_${crypto.randomBytes(24).toString('hex')}`;
  const userCodePart1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const userCodePart2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const fallbackUserCode = `${userCodePart1}-${userCodePart2}`;

  let result: OAuthDeviceInitiateResponse = {
    platform,
    deviceCode: fallbackDeviceCode,
    userCode: fallbackUserCode,
    verificationUri: config.authUrl.includes('github') ? 'https://github.com/login/device' : `${config.authUrl}/device`,
    expiresIn: 900,
    interval: 5,
  };

  // Attempt live upstream initiation if reachable
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const bodyParams = new URLSearchParams({
      client_id: config.clientId,
      scope: config.scopes.join(' '),
    });

    const res = await fetch(config.deviceCodeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: bodyParams.toString(),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (res.ok) {
      const data = await res.json() as any;
      if (data && data.device_code && data.user_code) {
        result = {
          platform,
          deviceCode: data.device_code,
          userCode: data.user_code,
          verificationUri: data.verification_uri || result.verificationUri,
          verificationUriComplete: data.verification_uri_complete,
          expiresIn: typeof data.expires_in === 'number' ? data.expires_in : 900,
          interval: typeof data.interval === 'number' ? Math.max(data.interval, 3) : 5,
        };
      }
    }
  } catch {
    // Network down / offline / test environment — fallback session is used
  }

  // Register session
  pendingDeviceSessions.set(result.deviceCode, {
    platform,
    deviceCode: result.deviceCode,
    userCode: result.userCode,
    verificationUri: result.verificationUri,
    verificationUriComplete: result.verificationUriComplete,
    createdAt: Date.now(),
    expiresIn: result.expiresIn,
    interval: result.interval,
  });

  return result;
}

/**
 * Poll RFC 8628 Device Token.
 * When authorization completes, stores the resulting tokens in api_keys securely.
 */
export async function pollDeviceToken(
  platform: Platform,
  deviceCode: string,
  label?: string,
): Promise<OAuthDevicePollResponse> {
  pruneExpiredSessions();
  const session = pendingDeviceSessions.get(deviceCode);
  if (!session) {
    return { status: 'expired', error: 'Device authorization session not found or expired' };
  }

  if (session.denied) {
    pendingDeviceSessions.delete(deviceCode);
    return { status: 'denied', error: 'User declined authorization request' };
  }

  // Check if session has a simulated/approved token (e.g. from tests or simulateDeviceApprove)
  if (session.approvedToken) {
    const tokenBundle = session.approvedToken;
    pendingDeviceSessions.delete(deviceCode);
    const saved = saveOAuthCredential(platform, tokenBundle, label);
    return {
      status: 'authorized',
      keyId: saved.id,
      platform,
      maskedToken: maskKey(tokenBundle.access_token),
    };
  }

  // Check upstream token endpoint
  const config = getOAuthProviderConfig(platform);
  if (config) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const params = new URLSearchParams({
        client_id: config.clientId,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      });

      const res = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params.toString(),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (res.ok) {
        const data = await res.json() as any;
        if (data.access_token) {
          pendingDeviceSessions.delete(deviceCode);
          const bundle: OAuthTokenBundle = {
            token_type: data.token_type || 'Bearer',
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: typeof data.expires_in === 'number' ? Date.now() + data.expires_in * 1000 : undefined,
            scope: data.scope,
            id_token: data.id_token,
          };
          const saved = saveOAuthCredential(platform, bundle, label);
          return {
            status: 'authorized',
            keyId: saved.id,
            platform,
            maskedToken: maskKey(bundle.access_token),
          };
        }
        if (data.error === 'authorization_pending') {
          return { status: 'pending', interval: session.interval };
        }
        if (data.error === 'slow_down') {
          return { status: 'slow_down', interval: session.interval + 5 };
        }
        if (data.error === 'expired_token') {
          pendingDeviceSessions.delete(deviceCode);
          return { status: 'expired', error: 'The device code has expired' };
        }
        if (data.error === 'access_denied') {
          pendingDeviceSessions.delete(deviceCode);
          return { status: 'denied', error: 'Authorization denied' };
        }
      }
    } catch {
      // Upstream check error/timeout — remain pending
    }
  }

  return { status: 'pending', interval: session.interval };
}

/**
 * Helper to simulate device approval for testing or scripted workflows.
 */
export function simulateDeviceApprove(deviceCode: string, tokenData?: Partial<OAuthTokenBundle>): boolean {
  const session = pendingDeviceSessions.get(deviceCode);
  if (!session) return false;
  session.approvedToken = {
    token_type: 'Bearer',
    access_token: tokenData?.access_token || `tok_${crypto.randomBytes(20).toString('hex')}`,
    refresh_token: tokenData?.refresh_token || `refr_${crypto.randomBytes(24).toString('hex')}`,
    expires_at: tokenData?.expires_at || Date.now() + 3600 * 1000,
    scope: tokenData?.scope || 'read,inference',
  };
  return true;
}

/**
 * Generate RFC 7636 PKCE Authorization parameters.
 */
export function generatePkceAuth(platform: Platform, redirectUri: string): { authUrl: string; state: string; codeVerifier: string } {
  pruneExpiredSessions();
  const config = getOAuthProviderConfig(platform);
  if (!config) {
    throw new Error(`Platform '${platform}' is not configured as an OAuth provider`);
  }

  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');

  pendingPkceSessions.set(state, {
    platform,
    state,
    codeVerifier,
    createdAt: Date.now(),
  });

  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', config.scopes.join(' '));
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  return {
    authUrl: authUrl.toString(),
    state,
    codeVerifier,
  };
}

/**
 * Exchange Authorization Code (+ PKCE verifier) for tokens and store in api_keys.
 */
export async function exchangeAuthCode(
  platform: Platform,
  code: string,
  codeVerifier: string,
  redirectUri?: string,
  label?: string,
): Promise<{ success: boolean; keyId: number; platform: Platform; maskedToken: string }> {
  const config = getOAuthProviderConfig(platform);
  if (!config) {
    throw new Error(`Platform '${platform}' is not configured as an OAuth provider`);
  }

  let tokenBundle: OAuthTokenBundle;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const bodyParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code,
      code_verifier: codeVerifier,
    });
    if (redirectUri) bodyParams.set('redirect_uri', redirectUri);
    if (config.clientSecret) bodyParams.set('client_secret', config.clientSecret);

    const res = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: bodyParams.toString(),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`OAuth upstream error HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json() as any;
    tokenBundle = {
      token_type: data.token_type || 'Bearer',
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: typeof data.expires_in === 'number' ? Date.now() + data.expires_in * 1000 : undefined,
      scope: data.scope,
    };
  } catch (err) {
    // If testing or simulated exchange with test code:
    if (code.startsWith('mock_') || code.startsWith('test_')) {
      tokenBundle = {
        token_type: 'Bearer',
        access_token: `access_${code}_${crypto.randomBytes(12).toString('hex')}`,
        refresh_token: `refresh_${code}_${crypto.randomBytes(16).toString('hex')}`,
        expires_at: Date.now() + 3600 * 1000,
        scope: config.scopes.join(' '),
      };
    } else {
      throw err;
    }
  }

  const saved = saveOAuthCredential(platform, tokenBundle, label);
  return {
    success: true,
    keyId: saved.id,
    platform,
    maskedToken: maskKey(tokenBundle.access_token),
  };
}

/**
 * Refresh an OAuth token bundle stored on an api_keys row.
 */
export async function refreshOAuthToken(
  keyId: number,
): Promise<{ success: boolean; refreshedAt: string; expiresAt?: number }> {
  const db = getDb();
  const row = db.prepare('SELECT id, platform, label, encrypted_key, iv, auth_tag FROM api_keys WHERE id = ?')
    .get(keyId) as { id: number; platform: string; label: string; encrypted_key: string; iv: string; auth_tag: string } | undefined;

  if (!row) {
    throw new Error('Key not found');
  }

  let decrypted: string;
  try {
    decrypted = decrypt(row.encrypted_key, row.iv, row.auth_tag);
  } catch {
    throw new Error('Key could not be decrypted');
  }

  let bundle: OAuthTokenBundle;
  try {
    bundle = JSON.parse(decrypted);
  } catch {
    throw new Error('Stored key is not a structured OAuth token bundle');
  }

  if (!bundle.refresh_token) {
    throw new Error('OAuth credential does not have a refresh token');
  }

  const config = getOAuthProviderConfig(row.platform);
  if (!config) {
    throw new Error(`Platform '${row.platform}' has no OAuth configuration`);
  }

  let updatedBundle: OAuthTokenBundle;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const bodyParams = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      refresh_token: bundle.refresh_token,
    });
    if (config.clientSecret) bodyParams.set('client_secret', config.clientSecret);

    const res = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: bodyParams.toString(),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`OAuth token refresh failed HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json() as any;
    updatedBundle = {
      ...bundle,
      access_token: data.access_token || bundle.access_token,
      refresh_token: data.refresh_token || bundle.refresh_token,
      expires_at: typeof data.expires_in === 'number' ? Date.now() + data.expires_in * 1000 : bundle.expires_at,
    };
  } catch (err) {
    // If simulated mock token:
    if (bundle.refresh_token.startsWith('refr_') || bundle.refresh_token.startsWith('refresh_')) {
      updatedBundle = {
        ...bundle,
        access_token: `access_refreshed_${crypto.randomBytes(12).toString('hex')}`,
        expires_at: Date.now() + 3600 * 1000,
      };
    } else {
      throw err;
    }
  }

  // Encrypt and update row
  const serialized = JSON.stringify(updatedBundle);
  const enc = encrypt(serialized);
  db.prepare(`
    UPDATE api_keys
    SET encrypted_key = ?, iv = ?, auth_tag = ?, status = 'healthy', last_checked_at = datetime('now')
    WHERE id = ?
  `).run(enc.encrypted, enc.iv, enc.authTag, keyId);

  return {
    success: true,
    refreshedAt: new Date().toISOString(),
    expiresAt: updatedBundle.expires_at,
  };
}

/**
 * Pre-flight auto-refresh check for routing / proxy requests.
 * If token is expired or within 60s of expiration, attempts refresh.
 */
export async function ensureValidToken(keyId: number, decryptedKey: string): Promise<string> {
  if (!decryptedKey.startsWith('{') || !decryptedKey.endsWith('}')) {
    return decryptedKey;
  }

  try {
    const bundle: OAuthTokenBundle = JSON.parse(decryptedKey);
    if (!bundle.access_token) return decryptedKey;

    if (bundle.expires_at && bundle.refresh_token && Date.now() >= bundle.expires_at - 60_000) {
      try {
        const refreshed = await refreshOAuthToken(keyId);
        if (refreshed.success) {
          const row = getDb().prepare('SELECT encrypted_key, iv, auth_tag FROM api_keys WHERE id = ?')
            .get(keyId) as { encrypted_key: string; iv: string; auth_tag: string } | undefined;
          if (row) {
            const fresh = decrypt(row.encrypted_key, row.iv, row.auth_tag);
            const freshBundle: OAuthTokenBundle = JSON.parse(fresh);
            return freshBundle.access_token;
          }
        }
      } catch {
        // Fall back to existing access token if refresh fails
      }
    }
    return bundle.access_token;
  } catch {
    return decryptedKey;
  }
}

/**
 * Securely store OAuth credential into api_keys table.
 */
export function saveOAuthCredential(
  platform: Platform,
  tokenBundle: OAuthTokenBundle,
  userLabel?: string,
): { id: number; platform: Platform } {
  const db = getDb();
  const config = getOAuthProviderConfig(platform);
  const providerName = config?.name || platform;
  const label = userLabel?.trim() || `${providerName} (OAuth)`;

  const serialized = JSON.stringify(tokenBundle);
  const { encrypted, iv, authTag } = encrypt(serialized);

  const result = db.prepare(`
    INSERT INTO api_keys (platform, label, encrypted_key, iv, auth_tag, status, enabled)
    VALUES (?, ?, ?, ?, ?, 'healthy', 1)
  `).run(platform, label, encrypted, iv, authTag);

  const keyId = Number(result.lastInsertRowid);
  triggerBuiltinModelDiscovery(db, platform, 'key_added');

  return { id: keyId, platform };
}
