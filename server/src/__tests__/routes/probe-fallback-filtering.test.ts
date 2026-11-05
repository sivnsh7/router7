import { describe, it, expect, beforeAll } from 'vitest'
import type { Express } from 'express'
import { createApp } from '../../app.js'
import { initDb } from '../../db/index.js'
import { recordProbeResult, ensureProbeTable } from '../../services/model-probe-verifier.js'
import { mintDashboardToken } from '../helpers/auth.js'

let dashToken = ''

async function apiRequest(app: Express, method: string, path: string, body?: any) {
  const server = app.listen(0, '127.0.0.1')
  if (!server.listening) await new Promise<void>(resolve => server.once('listening', () => resolve()))
  const addr = server.address() as any
  const url = `http://127.0.0.1:${addr.port}${path}`

  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${dashToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => null)
  server.close()
  return { status: res.status, body: data }
}

describe('Probe status and fallback filtering API', () => {
  let app: Express
  let db: any

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = '0'.repeat(64)
    db = initDb(':memory:')
    ensureProbeTable(db)
    app = createApp()
    dashToken = mintDashboardToken()
  })

  it('GET /api/fallback/probe-status returns probe metrics', async () => {
    recordProbeResult(db, 'google', 'gemini-2.5-flash', null, 200)
    recordProbeResult(db, 'anthropic', 'claude-fail', null, 404, 'Not found')

    const { status, body } = await apiRequest(app, 'GET', '/api/fallback/probe-status')
    expect(status).toBe(200)
    expect(body.summary).toBeDefined()
    expect(body.summary.passed200).toBeGreaterThanOrEqual(1)
    expect(body.summary.failed).toBeGreaterThanOrEqual(1)
  })

  it('GET /api/fallback hides failed models from fallback chain', async () => {
    const seeded = db.prepare('SELECT id, platform, model_id, endpoint_scope FROM models WHERE enabled = 1 LIMIT 2').all() as any[]
    expect(seeded.length).toBeGreaterThanOrEqual(2)

    const model1 = seeded[0]
    const model2 = seeded[1]

    // Mark model1 as 200 OK, and model2 as failed (500)
    recordProbeResult(db, model1.platform, model1.model_id, model1.endpoint_scope ?? null, 200)
    recordProbeResult(db, model2.platform, model2.model_id, model2.endpoint_scope ?? null, 500, 'Server error')

    const { status, body } = await apiRequest(app, 'GET', '/api/fallback')
    expect(status).toBe(200)
    const modelIds = body.map((entry: any) => entry.modelId)

    expect(modelIds).toContain(model1.model_id)
    expect(modelIds).not.toContain(model2.model_id)
  })

  it('GET /api/fallback hides failed probe models with error status', async () => {
    db.prepare(`
      INSERT INTO models (platform, model_id, display_name, intelligence_rank, speed_rank, size_label, enabled)
      VALUES ('google', 'gemini-failed-test', 'Failed Gemini', 10, 1, 'Large', 1)
    `).run()
    const inserted = db.prepare("SELECT id FROM models WHERE platform = 'google' AND model_id = 'gemini-failed-test'").get() as any
    db.prepare('INSERT OR REPLACE INTO fallback_config (model_db_id, priority, enabled) VALUES (?, 999, 1)').run(inserted.id)
    recordProbeResult(db, 'google', 'gemini-failed-test', null, 404, 'Not found')

    const { status, body } = await apiRequest(app, 'GET', '/api/fallback')
    expect(status).toBe(200)
    const modelIds = body.map((entry: any) => entry.modelId)
    expect(modelIds).not.toContain('gemini-failed-test')
  })

  it('POST /api/fallback/probe-run triggers manual verification pass', async () => {
    const { status, body } = await apiRequest(app, 'POST', '/api/fallback/probe-run')
    expect(status).toBe(200)
    expect(body).toHaveProperty('checked')
    expect(body).toHaveProperty('ok200')
    expect(body).toHaveProperty('failed')
  })

  it('GET /api/fallback hides removed providers and provider-level failures', async () => {
    // Insert a model for a removed platform
    db.prepare(`
      INSERT INTO models (platform, model_id, display_name, intelligence_rank, speed_rank, size_label, enabled)
      VALUES ('aclide', 'aclide-model-test', 'Aclide Model', 20, 5, 'Medium', 1)
    `).run()
    const inserted = db.prepare("SELECT id FROM models WHERE platform = 'aclide' AND model_id = 'aclide-model-test'").get() as any
    db.prepare('INSERT OR REPLACE INTO fallback_config (model_db_id, priority, enabled) VALUES (?, 998, 1)').run(inserted.id)
    recordProbeResult(db, 'aclide', 'aclide-model-test', null, 404, 'Provider removed')

    const { status, body } = await apiRequest(app, 'GET', '/api/fallback')
    expect(status).toBe(200)
    const platforms = body.map((entry: any) => entry.platform)
    expect(platforms).not.toContain('aclide')
  })
})
