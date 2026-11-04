import type { Db } from '../db/types.js';
import type { Scheduler } from '../lib/scheduler.js';
import { resolveProvider, getProvider, isRemovedPlatform } from '../providers/index.js';
import { decrypt } from '../lib/crypto.js';
import { decryptProxyUrl } from '../lib/key-proxy.js';
import { withKeyProxy } from '../lib/proxy.js';
import type { Platform } from '@router7/shared/types.js';

export interface ModelProbeRow {
  modelDbId?: number;
  platform: string;
  modelId: string;
  endpointScope?: string | null;
}

export interface ModelProbeResult {
  platform: string;
  modelId: string;
  endpointScope?: string | null;
  statusCode: number;
  error?: string | null;
  is200: boolean;
  checkedAt: number;
}

/**
 * Initializes the persistent SQLite table for model probe statuses.
 */
export function initModelProbeVerifierDb(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_probe_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      model_id TEXT NOT NULL,
      endpoint_scope TEXT NOT NULL DEFAULT '',
      last_status_code INTEGER NOT NULL,
      last_error TEXT,
      is_200 INTEGER NOT NULL DEFAULT 0,
      checked_at INTEGER NOT NULL,
      UNIQUE(platform, model_id, endpoint_scope)
    );
    CREATE INDEX IF NOT EXISTS idx_model_probe_status_200 ON model_probe_status(is_200);
    CREATE INDEX IF NOT EXISTS idx_model_probe_platform ON model_probe_status(platform);
  `);
}

export const ensureProbeTable = initModelProbeVerifierDb;

/**
 * Records or updates the probe outcome for a specific platform and model.
 */
export function recordProbeResult(
  db: Db,
  platform: string,
  modelId: string,
  endpointScope: string | null = null,
  statusCode: number,
  error: string | null = null,
): void {
  initModelProbeVerifierDb(db);
  const scope = endpointScope ?? '';
  const is200 = statusCode === 200 ? 1 : 0;
  db.prepare(`
    INSERT INTO model_probe_status
      (platform, model_id, endpoint_scope, last_status_code, last_error, is_200, checked_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(platform, model_id, endpoint_scope) DO UPDATE SET
      last_status_code = excluded.last_status_code,
      last_error = excluded.last_error,
      is_200 = excluded.is_200,
      checked_at = excluded.checked_at
  `).run(platform, modelId, scope, statusCode, error, is200, Date.now());
}

/**
 * Determines which models must be checked:
 * - On first run (empty table): checks all enabled models.
 * - On subsequent runs: checks ONLY previously failed models (is_200 = 0) and any newly added models.
 *   Models with confirmed 200 OK are remembered and skipped.
 */
export function getModelsToProbe(db: Db): ModelProbeRow[] {
  initModelProbeVerifierDb(db);
  const countRow = db.prepare('SELECT COUNT(*) as count FROM model_probe_status').get() as { count: number };
  const hasHistory = (countRow?.count ?? 0) > 0;

  let rows: ModelProbeRow[];
  if (!hasHistory) {
    // First run: all enabled models
    rows = db.prepare(`
      SELECT id as modelDbId, platform, model_id as modelId, endpoint_scope as endpointScope
      FROM models
      WHERE enabled = 1
    `).all() as any[];
  } else {
    // Subsequent runs: ONLY failed models (is_200 = 0) PLUS unprobed new models
    rows = db.prepare(`
      SELECT m.id as modelDbId, m.platform, m.model_id as modelId, m.endpoint_scope as endpointScope
      FROM models m
      LEFT JOIN model_probe_status s ON s.platform = m.platform AND s.model_id = m.model_id
        AND COALESCE(s.endpoint_scope, '') = COALESCE(m.endpoint_scope, '')
      WHERE m.enabled = 1
        AND (s.is_200 IS NULL OR s.is_200 = 0)
    `).all() as any[];
  }

  return rows.filter(r => !isRemovedPlatform(r.platform));
}

/**
 * Probes a single model quickly using minimal resources (1 token, 2.5s timeout).
 */
export async function probeSingleModel(
  db: Db,
  item: ModelProbeRow,
): Promise<ModelProbeResult> {
  const { platform, modelId, endpointScope } = item;
  const now = Date.now();

  // Find active key for platform
  const keyRow = db.prepare(`
    SELECT * FROM api_keys
    WHERE platform = ? AND enabled = 1
    ORDER BY id ASC LIMIT 1
  `).get(platform) as any;

  const provider = resolveProvider(platform as Platform);
  if (!provider) {
    return {
      platform,
      modelId,
      endpointScope,
      statusCode: 404,
      error: 'Provider not registered or removed',
      is200: false,
      checkedAt: now,
    };
  }

  if (!keyRow && !provider.keyless) {
    return {
      platform,
      modelId,
      endpointScope,
      statusCode: 401,
      error: 'No active API key configured',
      is200: false,
      checkedAt: now,
    };
  }

  try {
    let apiKey = '';
    let proxyUrl = '';
    if (keyRow) {
      apiKey = decrypt(keyRow.encrypted_key, keyRow.iv, keyRow.auth_tag);
      proxyUrl = decryptProxyUrl(keyRow);
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 2500);

    try {
      await withKeyProxy(proxyUrl, async () => {
        await provider.chatCompletion(
          apiKey,
          [{ role: 'user', content: '1' }],
          modelId,
          {
            max_tokens: 1,
            timeoutMs: 2500,
            signal: abortController.signal,
          },
        );
      });

      clearTimeout(timeout);
      return {
        platform,
        modelId,
        endpointScope,
        statusCode: 200,
        error: null,
        is200: true,
        checkedAt: now,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (err: any) {
    // Extract status code from error object or message
    let status = 500;
    if (typeof err?.status === 'number') {
      status = err.status;
    } else if (typeof err?.statusCode === 'number') {
      status = err.statusCode;
    } else if (err?.name === 'AbortError' || err?.message?.includes('timeout') || err?.message?.includes('abort')) {
      status = 504;
    } else {
      const match = String(err?.message || '').match(/\b([45]\d\d)\b/);
      if (match) {
        status = Number.parseInt(match[1], 10);
      }
    }

    return {
      platform,
      modelId,
      endpointScope,
      statusCode: status,
      error: String(err?.message || 'Upstream probe failed').slice(0, 250),
      is200: false,
      checkedAt: now,
    };
  }
}

/**
 * Executes a fast, low-RAM probe pass over the candidate models with bounded concurrency.
 */
export async function runModelProbePass(
  db: Db,
  opts: { concurrency?: number } = {},
): Promise<{ checked: number; ok200: number; failed: number }> {
  initModelProbeVerifierDb(db);
  const candidates = getModelsToProbe(db);
  if (candidates.length === 0) {
    return { checked: 0, ok200: 0, failed: 0 };
  }

  const concurrency = opts.concurrency ?? 5;
  let index = 0;
  let ok200 = 0;
  let failed = 0;

  const upsert = db.prepare(`
    INSERT INTO model_probe_status
      (platform, model_id, endpoint_scope, last_status_code, last_error, is_200, checked_at)
    VALUES
      (@platform, @modelId, @endpointScope, @statusCode, @error, @is200, @checkedAt)
    ON CONFLICT(platform, model_id, endpoint_scope) DO UPDATE SET
      last_status_code = excluded.last_status_code,
      last_error = excluded.last_error,
      is_200 = excluded.is_200,
      checked_at = excluded.checked_at
  `);

  async function worker() {
    while (index < candidates.length) {
      const current = candidates[index++];
      if (!current) break;
      const res = await probeSingleModel(db, current);
      upsert.run({
        platform: res.platform,
        modelId: res.modelId,
        endpointScope: res.endpointScope ?? '',
        statusCode: res.statusCode,
        error: res.error || null,
        is200: res.is200 ? 1 : 0,
        checkedAt: res.checkedAt,
      });
      if (res.is200) ok200++;
      else failed++;
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, candidates.length) }, () => worker());
  await Promise.all(workers);

  return { checked: candidates.length, ok200, failed };
}

/**
 * Checks if a model is verified as 200 OK.
 * If model probing has run, only 200 OK models are allowed for routing and fallbacks.
 */
export function isModel200Ok(
  db: Db,
  platform: string,
  modelId: string,
  endpointScope?: string | null,
): boolean {
  initModelProbeVerifierDb(db);
  const countRow = db.prepare('SELECT COUNT(*) as count FROM model_probe_status').get() as { count: number };
  if (!countRow || countRow.count === 0) {
    // Probing has not run yet (or table empty) -> bootstrap permissive
    return true;
  }

  const scope = endpointScope ?? '';
  const row = db.prepare(`
    SELECT is_200 FROM model_probe_status
    WHERE platform = ? AND model_id = ? AND endpoint_scope = ?
  `).get(platform, modelId, scope) as { is_200: number } | undefined;
  if (row !== undefined) {
    return row.is_200 === 1;
  }

  const rows = db.prepare(`
    SELECT is_200 FROM model_probe_status
    WHERE platform = ? AND model_id = ?
    ORDER BY is_200 DESC LIMIT 1
  `).get(platform, modelId) as { is_200: number } | undefined;

  return rows !== undefined && rows.is_200 === 1;
}

/**
 * Returns true if a model is known to have failed (non-200 status code).
 */
export function isModelFailed(
  db: Db,
  platform: string,
  modelId: string,
  endpointScope?: string | null,
): boolean {
  initModelProbeVerifierDb(db);
  const scope = endpointScope ?? '';
  const row = db.prepare(`
    SELECT is_200 FROM model_probe_status
    WHERE platform = ? AND model_id = ? AND endpoint_scope = ?
  `).get(platform, modelId, scope) as { is_200: number } | undefined;
  if (row !== undefined) {
    return row.is_200 === 0;
  }

  const rows = db.prepare(`
    SELECT is_200 FROM model_probe_status
    WHERE platform = ? AND model_id = ?
  `).all(platform, modelId) as Array<{ is_200: number }>;

  if (rows.length === 0) return false;
  return rows.every(r => r.is_200 === 0);
}

/**
 * Returns set of failed keys in format "platform:modelId".
 */
export function getFailedModelKeys(db: Db): Set<string> {
  initModelProbeVerifierDb(db);
  const rows = db.prepare(`
    SELECT platform, model_id FROM model_probe_status WHERE is_200 = 0
  `).all() as Array<{ platform: string; model_id: string }>;

  return new Set(rows.map(r => `${r.platform}:${r.model_id}`));
}

/**
 * Checks if all probed models for a provider have failed.
 */
export function isProviderFailed(db: Db, platform: string): boolean {
  initModelProbeVerifierDb(db);
  const row = db.prepare(`
    SELECT COUNT(*) as total, SUM(is_200) as ok_count
    FROM model_probe_status
    WHERE platform = ?
  `).get(platform) as { total: number; ok_count: number | null } | undefined;

  if (!row || row.total === 0) return false;
  return (row.ok_count ?? 0) === 0;
}

/**
 * Returns a diagnostic summary of the model probe results.
 */
export function getModelProbeSummary(db: Db) {
  initModelProbeVerifierDb(db);
  const total = (db.prepare('SELECT COUNT(*) as count FROM model_probe_status').get() as { count: number })?.count ?? 0;
  const ok200 = (db.prepare('SELECT COUNT(*) as count FROM model_probe_status WHERE is_200 = 1').get() as { count: number })?.count ?? 0;
  const failed = total - ok200;

  const errorCodes = db.prepare(`
    SELECT last_status_code as code, COUNT(*) as count
    FROM model_probe_status
    WHERE is_200 = 0
    GROUP BY last_status_code
  `).all() as Array<{ code: number; count: number }>;

  const byErrorCode: Record<number, number> = {};
  for (const { code, count } of errorCodes) {
    byErrorCode[code] = count;
  }

  const results = db.prepare(`
    SELECT platform, model_id as modelId, endpoint_scope as endpointScope,
           last_status_code as statusCode, last_error as error, is_200 as is200,
           checked_at as checkedAt
    FROM model_probe_status
    ORDER BY checked_at DESC
  `).all() as any[];

  return {
    totalProbed: total,
    totalChecked: total,
    okCount: ok200,
    passed200: ok200,
    failedCount: failed,
    failed,
    byErrorCode,
    summary: {
      totalChecked: total,
      passed200: ok200,
      failed,
      byErrorCode,
    },
    results,
  };
}

/**
 * Starts the model probe verifier in the background when the server starts up.
 */
export function startModelProbeVerifier(db: Db, scheduler?: Scheduler): void {
  // Run asynchronously in background after a brief delay so server finishes binding port first
  const run = () => {
    runModelProbePass(db)
      .then(res => {
        if (res.checked > 0) {
          console.log(`[ModelProbe] Verified ${res.checked} models: ${res.ok200} ok (200), ${res.failed} failed/hidden`);
        }
      })
      .catch(err => {
        console.warn(`[ModelProbe] Background probe error: ${err instanceof Error ? err.message : String(err)}`);
      });
  };

  if (scheduler) {
    scheduler.after(1000, run);
  } else {
    setTimeout(run, 1000);
  }
}
