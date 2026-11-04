import { describe, it, expect } from 'vitest'
import {
  getAllProviders,
  getActiveProviders,
  hasProvider,
  getProvider,
  isRemovedPlatform,
  REMOVED_PROVIDERS,
} from '../../providers/index'
import {
  getProviderCategory,
  OAUTH_PLATFORMS,
  GATEWAY_PLATFORMS,
  type Platform,
} from '../../../../shared/types'

describe('New and Removed Providers Architecture', () => {
  const newPlatforms: Platform[] = [
    'antigravity',
    'copilot',
    'codex',
    'openreference',
    'codestral',
    'dahl',
    'agentrouter',
    'fastrouter',
    'llmgateway',
  ]

  const removedSample: Platform[] = [
    'aclide',
    'speka',
    'llmtr',
    'moondream',
    'groq',
    'cerebras',
    'router9',
    'mistral',
    'zhipu',
    'pollinations',
    'reka',
    'xfyun',
    'siliconflow',
  ]

  it('all 9 new providers are properly registered in provider registry', () => {
    const all = getAllProviders().map(p => p.platform)
    for (const p of newPlatforms) {
      expect(all).toContain(p)
      expect(hasProvider(p)).toBe(true)
      const provider = getProvider(p)
      expect(provider).toBeDefined()
      expect(provider?.platform).toBe(p)
    }
  })

  it('all 32 removed providers are recorded in REMOVED_PROVIDERS and isRemovedPlatform', () => {
    expect(REMOVED_PROVIDERS.size).toBe(32)

    const active = getActiveProviders().map(p => p.platform)
    for (const removed of removedSample) {
      expect(isRemovedPlatform(removed)).toBe(true)
      expect(active).not.toContain(removed)
    }
  })

  it('categorizes all providers accurately into oauth, api, and gateway', () => {
    // Check OAuth
    expect(getProviderCategory('antigravity')).toBe('oauth')
    expect(getProviderCategory('copilot')).toBe('oauth')
    expect(getProviderCategory('codex')).toBe('oauth')
    expect(getProviderCategory('openreference')).toBe('oauth')
    expect(OAUTH_PLATFORMS).toContain('antigravity')

    // Check Gateway
    expect(getProviderCategory('agentrouter')).toBe('gateway')
    expect(getProviderCategory('fastrouter')).toBe('gateway')
    expect(getProviderCategory('llmgateway')).toBe('gateway')
    expect(getProviderCategory('openrouter')).toBe('gateway')
    expect(GATEWAY_PLATFORMS).toContain('agentrouter')

    // Check API
    expect(getProviderCategory('codestral')).toBe('api')
    expect(getProviderCategory('dahl')).toBe('api')
    expect(getProviderCategory('google')).toBe('api')
    expect(getProviderCategory('nvidia')).toBe('api')
  })
})
