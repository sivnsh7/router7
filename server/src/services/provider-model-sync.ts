import type { Db } from '../db/types.js';
import type { Scheduler } from '../lib/scheduler.js';
import type { Platform } from '@router7/shared/types.js';
import { resolveProvider } from '../providers/index.js';
import { OpenAICompatProvider } from '../providers/openai-compat.js';
import { decrypt } from '../lib/crypto.js';
import { decryptProxyUrl } from '../lib/key-proxy.js';
import { withKeyProxy } from '../lib/proxy.js';
import { discoverEndpointModels, discoverProviderModels, type DiscoveredModel, ModelDiscoveryError } from './model-discovery.js';
import { customModelSeed } from './custom-model-seed.js';
import { ensureModelInProfiles } from './profile-models.js';
import { endpointScopeForBaseUrl } from '../lib/endpoint-scope.js';

export interface ProviderModelSyncResult {
  success: boolean;
  platform: string;
  keyId?: number;
  totalDiscovered: number;
  addedCount: number;
  updatedCount: number;
  existingCount: number;
  addedModels: string[];
  updatedModels: string[];
}

interface KeyRow {
  id: number;
  platform: string;
  label: string;
  encrypted_key: string;
  iv: string;
  auth_tag: string;
  base_url?: string | null;
  proxy_encrypted?: string | null;
  proxy_iv?: string | null;
  proxy_auth_tag?: string | null;
}

/** Check if auto-sync is enabled for a platform (or custom key) in settings. */
export function isProviderAutoSyncEnabled(db: Db, platform: string, keyId?: number): boolean {
  const key = keyId && platform === 'custom' ? `auto_sync_models:custom:${keyId}` : `auto_sync_models:${platform}`;
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value === '1';
}

/** Set auto-sync enabled flag for a platform (or custom key) in settings. */
export function setProviderAutoSync(db: Db, platform: string, enabled: boolean, keyId?: number): void {
  const key = keyId && platform === 'custom' ? `auto_sync_models:custom:${keyId}` : `auto_sync_models:${platform}`;
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, enabled ? '1' : '0');
}

/**
 * Fetch and update models for any configured provider through its endpoint.
 * Works for both custom endpoints and built-in OpenAI-compatible providers.
 * Non-destructive: adds new models, enriches metadata (vision, context),
 * and preserves user ranking and manual toggles.
 */
export async function fetchAndUpdateProviderModels(
  db: Db,
  platform: string,
  keyId?: number,
): Promise<ProviderModelSyncResult> {
  // 1. Locate the credential row
  let keyRow: KeyRow | undefined;
  if (keyId != null) {
    keyRow = db.prepare(`
      SELECT id, platform, label, encrypted_key, iv, auth_tag, base_url, proxy_encrypted, proxy_iv, proxy_auth_tag
        FROM api_keys
       WHERE id = ?
    `).get(keyId) as KeyRow | undefined;
  } else {
    keyRow = db.prepare(`
      SELECT id, platform, label, encrypted_key, iv, auth_tag, base_url, proxy_encrypted, proxy_iv, proxy_auth_tag
        FROM api_keys
       WHERE platform = ? AND enabled = 1 AND status != 'invalid'
       ORDER BY CASE status WHEN 'healthy' THEN 0 ELSE 1 END, id
       LIMIT 1
    `).get(platform) as KeyRow | undefined;
  }

  if (!keyRow) {
    throw new ModelDiscoveryError(400, `No active key configured for provider "${platform}". Please configure an API key first.`);
  }

  const apiKey = decrypt(keyRow.encrypted_key, keyRow.iv, keyRow.auth_tag);
  const proxyUrl = decryptProxyUrl(keyRow);

  // 2. Query the provider's /models endpoint
  let discovered: DiscoveredModel[] = [];
  let endpointScope = '';

  if (platform === 'custom') {
    const baseUrl = keyRow.base_url?.trim();
    if (!baseUrl) {
      throw new ModelDiscoveryError(400, 'Custom provider is missing a valid base URL.');
    }
    endpointScope = endpointScopeForBaseUrl(baseUrl);
    discovered = await withKeyProxy(proxyUrl, () => discoverEndpointModels(baseUrl, apiKey));
  } else {
    const provider = resolveProvider(platform as Platform);
    if (!provider || !(provider instanceof OpenAICompatProvider)) {
      throw new ModelDiscoveryError(400, `Provider "${platform}" does not expose an OpenAI-compatible /models endpoint.`);
    }
    const label = provider.modelsUrl.replace(/\/models\/?$/, '');
    discovered = await withKeyProxy(proxyUrl, () =>
      discoverProviderModels(provider, apiKey, label)
    );
  }

  // 3. Reconcile models into the database
  const result: ProviderModelSyncResult = {
    success: true,
    platform,
    keyId: keyRow.id,
    totalDiscovered: discovered.length,
    addedCount: 0,
    updatedCount: 0,
    existingCount: 0,
    addedModels: [],
    updatedModels: [],
  };

  db.transaction(() => {
    const seed = customModelSeed(db);
    const existingRows = db.prepare(`
      SELECT id, model_id, context_window, supports_vision, supports_tools
        FROM models
       WHERE platform = ? AND endpoint_scope = ?
    `).all(platform, endpointScope) as Array<{
      id: number;
      model_id: string;
      context_window: number | null;
      supports_vision: number;
      supports_tools: number;
    }>;

    const existingMap = new Map(existingRows.map(r => [r.model_id, r]));

    const updateMetaStmt = db.prepare(`
      UPDATE models
         SET context_window = COALESCE(?, context_window),
             supports_vision = CASE WHEN ? = 1 THEN 1 ELSE supports_vision END,
             supports_tools = CASE WHEN ? = 1 THEN 1 ELSE supports_tools END
       WHERE id = ?
    `);

    const insertStmt = db.prepare(`
      INSERT INTO models
        (platform, model_id, display_name, intelligence_rank, speed_rank, size_label,
         rpm_limit, rpd_limit, tpm_limit, tpd_limit, monthly_token_budget, context_window, enabled, key_id,
         supports_tools, supports_vision, source, endpoint_scope)
      VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, '', ?, 1, ?, 1, ?, 'discovered', ?)
    `);

    const selectIdStmt = db.prepare(
      'SELECT id FROM models WHERE platform = ? AND model_id = ? AND endpoint_scope = ?'
    );
    const maxPriorityStmt = db.prepare('SELECT COALESCE(MAX(priority), 0) AS m FROM fallback_config');
    const addToFallbackStmt = db.prepare(
      'INSERT INTO fallback_config (model_db_id, priority, enabled) VALUES (?, ?, 1)'
    );
    const inFallbackStmt = db.prepare('SELECT 1 FROM fallback_config WHERE model_db_id = ?');

    for (const m of discovered) {
      // Discard non-chat models (pure embeddings or audio endpoints) from the chat models table
      if (m.kind !== undefined && m.kind !== 'image') {
        continue;
      }

      const existing = existingMap.get(m.id);
      if (existing) {
        let needsUpdate = false;
        let newContext = existing.context_window;
        let newVision = existing.supports_vision;
        const newTools = existing.supports_tools;

        if (m.contextWindow && (!existing.context_window || existing.context_window < m.contextWindow)) {
          newContext = m.contextWindow;
          needsUpdate = true;
        }
        if (m.vision && existing.supports_vision === 0) {
          newVision = 1;
          needsUpdate = true;
        }

        if (needsUpdate) {
          updateMetaStmt.run(newContext, newVision, newTools, existing.id);
          result.updatedCount++;
          result.updatedModels.push(m.id);
        } else {
          result.existingCount++;
        }
      } else {
        // Brand new model discovered from upstream endpoint
        const boundKeyId = platform === 'custom' ? keyRow!.id : null;
        const visionVal = m.vision ? 1 : 0;
        insertStmt.run(
          platform,
          m.id,
          m.id,
          seed.intelligenceRank,
          seed.speedRank,
          seed.sizeLabel,
          m.contextWindow ?? null,
          boundKeyId,
          visionVal,
          endpointScope,
        );

        const row = selectIdStmt.get(platform, m.id, endpointScope) as { id: number } | undefined;
        if (row && !inFallbackStmt.get(row.id)) {
          const nextPriority = (maxPriorityStmt.get() as { m: number }).m + 1;
          addToFallbackStmt.run(row.id, nextPriority);
          ensureModelInProfiles(db, row.id);
        }
        result.addedCount++;
        result.addedModels.push(m.id);
      }
    }
  })();

  return result;
}

/**
 * Execute auto-sync for every provider that has auto-sync enabled in settings.
 */
export async function runAutoSyncForEnabledProviders(db: Db): Promise<{ synced: number; results: ProviderModelSyncResult[] }> {
  const rows = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'auto_sync_models:%' AND value = '1'").all() as Array<{
    key: string;
    value: string;
  }>;

  const results: ProviderModelSyncResult[] = [];
  for (const row of rows) {
    const rawKey = row.key.replace(/^auto_sync_models:/, '');
    let platform = rawKey;
    let keyId: number | undefined;

    if (rawKey.startsWith('custom:')) {
      platform = 'custom';
      keyId = Number(rawKey.replace('custom:', ''));
    }

    try {
      const res = await fetchAndUpdateProviderModels(db, platform, keyId);
      results.push(res);
    } catch (err: unknown) {
      console.warn(`[provider-model-sync] auto-sync failed for ${platform}: ${(err as Error)?.message ?? err}`);
    }
  }

  return { synced: results.length, results };
}

/**
 * Start periodic background sync for providers that have auto-sync enabled in settings.
 */
export function startProviderAutoSync(db: Db, scheduler: Scheduler): (() => void) | null {
  const intervalMs = 60 * 60 * 1000; // Hourly sync
  return scheduler.every(intervalMs, () => { void runAutoSyncForEnabledProviders(db); }, { name: 'provider-model-auto-sync' });
}
