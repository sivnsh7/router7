import { describe, it, expect } from 'vitest'
import { computeProviderStatusCategory, sortProviderGroups } from './provider-sorting'
import type { ApiKey } from '../../../shared/types'

function makeMockKey(id: number, platform: string, enabled: boolean, cooldowns?: { modelId: string; expiresAtMs: number; remainingMs: number }[]): ApiKey {
  return {
    id,
    platform: platform as any,
    label: `Key ${id}`,
    maskedKey: 'sk-...',
    baseUrl: null,
    keyless: false,
    exportable: true,
    status: 'healthy',
    enabled,
    createdAt: new Date().toISOString(),
    lastCheckedAt: null,
    lastHealthError: null,
    cooldowns,
  }
}

describe('provider-sorting', () => {
  it('identifies unconfigured providers when no keys present', () => {
    const res = computeProviderStatusCategory([], () => 'unknown')
    expect(res.category).toBe('unconfigured')
  })

  it('identifies healthy providers when keys are enabled and healthy', () => {
    const keys = [makeMockKey(1, 'groq', true)]
    const res = computeProviderStatusCategory(keys, () => 'healthy')
    expect(res.category).toBe('healthy')
    expect(res.healthyCount).toBe(1)
  })

  it('identifies attention-needed providers when key has active cooldown', () => {
    const keys = [makeMockKey(1, 'groq', true, [{ modelId: 'llama-3', expiresAtMs: Date.now() + 5000, remainingMs: 5000 }])]
    const res = computeProviderStatusCategory(keys, () => 'healthy')
    expect(res.category).toBe('attention')
    expect(res.cooldownCount).toBe(1)
  })

  it('sorts healthy before attention before unconfigured', () => {
    const gUnconfigured = { label: 'Z-Empty', keys: [], statusCategory: 'unconfigured' as const }
    const gAttention = { label: 'B-Degraded', keys: [makeMockKey(1, 'b', true)], statusCategory: 'attention' as const }
    const gHealthy = { label: 'A-Good', keys: [makeMockKey(2, 'a', true)], statusCategory: 'healthy' as const }

    const sorted = sortProviderGroups([gUnconfigured, gAttention, gHealthy])
    expect(sorted.map(s => s.label)).toEqual(['A-Good', 'B-Degraded', 'Z-Empty'])
  })
})
