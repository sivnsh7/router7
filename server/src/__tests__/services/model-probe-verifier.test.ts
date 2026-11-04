import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import {
  ensureProbeTable,
  recordProbeResult,
  getModelsToProbe,
  isModel200Ok,
  isModelFailed,
  isProviderFailed,
  getModelProbeSummary,
} from '../../services/model-probe-verifier'

describe('model-probe-verifier service', () => {
  let db: Database.Database

  beforeEach(() => {
    db = new Database(':memory:')
    // Create base tables needed by probe verifier
    db.exec(`
      CREATE TABLE IF NOT EXISTS models (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        model_id TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        endpoint_scope TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform TEXT NOT NULL,
        key TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1
      );
    `)
    ensureProbeTable(db)
  })

  it('creates the model_probe_status table with proper schema and indexes', () => {
    const tableInfo = db.prepare("PRAGMA table_info(model_probe_status)").all() as { name: string }[]
    const colNames = tableInfo.map(c => c.name)
    expect(colNames).toContain('platform')
    expect(colNames).toContain('model_id')
    expect(colNames).toContain('last_status_code')
    expect(colNames).toContain('is_200')
    expect(colNames).toContain('checked_at')
  })

  it('on initial run (no prior probe history), schedules all enabled models for probing', () => {
    db.prepare('INSERT INTO models (platform, model_id, enabled) VALUES (?, ?, 1)').run('google', 'gemini-2.5-flash')
    db.prepare('INSERT INTO models (platform, model_id, enabled) VALUES (?, ?, 1)').run('anthropic', 'claude-3-5-sonnet')
    db.prepare('INSERT INTO models (platform, model_id, enabled) VALUES (?, ?, 0)').run('disabled-plat', 'disabled-model')

    const toProbe = getModelsToProbe(db)
    expect(toProbe).toHaveLength(2)
    expect(toProbe.map(m => m.modelId)).toContain('gemini-2.5-flash')
    expect(toProbe.map(m => m.modelId)).toContain('claude-3-5-sonnet')
    expect(toProbe.map(m => m.modelId)).not.toContain('disabled-model')
  })

  it('records probe result and tracks exact HTTP status codes', () => {
    recordProbeResult(db, 'google', 'gemini-2.5-flash', null, 200)
    recordProbeResult(db, 'openai', 'gpt-4o', null, 401, 'Unauthorized')
    recordProbeResult(db, 'anthropic', 'claude-old', null, 404, 'Model Not Found')
    recordProbeResult(db, 'groq', 'llama-error', null, 500, 'Internal Server Error')

    expect(isModel200Ok(db, 'google', 'gemini-2.5-flash')).toBe(true)
    expect(isModelFailed(db, 'google', 'gemini-2.5-flash')).toBe(false)

    expect(isModel200Ok(db, 'openai', 'gpt-4o')).toBe(false)
    expect(isModelFailed(db, 'openai', 'gpt-4o')).toBe(true)

    expect(isModelFailed(db, 'anthropic', 'claude-old')).toBe(true)
    expect(isModelFailed(db, 'groq', 'llama-error')).toBe(true)
  })

  it('on subsequent runs with history, probes ONLY failed and new models, skipping verified 200 OK models', () => {
    db.prepare('INSERT INTO models (platform, model_id, enabled) VALUES (?, ?, 1)').run('google', 'gemini-2.5-flash')
    db.prepare('INSERT INTO models (platform, model_id, enabled) VALUES (?, ?, 1)').run('openai', 'gpt-4o')
    db.prepare('INSERT INTO models (platform, model_id, enabled) VALUES (?, ?, 1)').run('copilot', 'claude-3.5-sonnet')

    // Simulate previous boot probe: google is 200 OK, openai failed with 401, copilot is unprobed
    recordProbeResult(db, 'google', 'gemini-2.5-flash', null, 200)
    recordProbeResult(db, 'openai', 'gpt-4o', null, 401, 'Invalid key')

    const toProbe = getModelsToProbe(db)
    const probeModelIds = toProbe.map(m => m.modelId)

    // google (200 OK) MUST be skipped on restart
    expect(probeModelIds).not.toContain('gemini-2.5-flash')
    // openai (failed) MUST be re-checked
    expect(probeModelIds).toContain('gpt-4o')
    // copilot (unprobed) MUST be checked
    expect(probeModelIds).toContain('claude-3.5-sonnet')
  })

  it('differentiates platform-level failures when all models of a provider fail', () => {
    db.prepare('INSERT INTO models (platform, model_id, enabled) VALUES (?, ?, 1)').run('testprov', 'model-a')
    db.prepare('INSERT INTO models (platform, model_id, enabled) VALUES (?, ?, 1)').run('testprov', 'model-b')

    recordProbeResult(db, 'testprov', 'model-a', null, 403, 'Account suspended')
    recordProbeResult(db, 'testprov', 'model-b', null, 403, 'Account suspended')

    expect(isProviderFailed(db, 'testprov')).toBe(true)

    // If one model recovers to 200 OK, provider is no longer completely failed
    recordProbeResult(db, 'testprov', 'model-a', null, 200)
    expect(isProviderFailed(db, 'testprov')).toBe(false)
  })

  it('computes accurate probe summary metrics', () => {
    recordProbeResult(db, 'p1', 'm1', null, 200)
    recordProbeResult(db, 'p1', 'm2', null, 200)
    recordProbeResult(db, 'p2', 'm3', null, 503, 'Service unavailable')

    const summary = getModelProbeSummary(db)
    expect(summary.totalProbed).toBe(3)
    expect(summary.okCount).toBe(2)
    expect(summary.failedCount).toBe(1)
  })

  it('skips 200 OK catalog models with default empty endpoint_scope on restart', () => {
    db.prepare('INSERT INTO models (platform, model_id, enabled) VALUES (?, ?, 1)').run('google', 'gemini-flash-cat')
    db.prepare('INSERT INTO models (platform, model_id, enabled) VALUES (?, ?, 1)').run('openai', 'gpt-cat-failed')

    recordProbeResult(db, 'google', 'gemini-flash-cat', null, 200)
    recordProbeResult(db, 'openai', 'gpt-cat-failed', null, 401, 'Invalid key')

    const toProbe = getModelsToProbe(db)
    const probeModelIds = toProbe.map(m => m.modelId)

    expect(probeModelIds).not.toContain('gemini-flash-cat')
    expect(probeModelIds).toContain('gpt-cat-failed')
  })
})
