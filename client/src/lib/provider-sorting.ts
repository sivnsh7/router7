import type { ApiKey } from '../../../shared/types'

export type ProviderStatusCategory = 'healthy' | 'attention' | 'disabled' | 'unconfigured'

export interface ProviderGroupData {
  value: string
  label: string
  url?: string
  keys: ApiKey[]
  statusCategory: ProviderStatusCategory
  healthyCount: number
  cooldownCount: number
  errorCount: number
}

export type ProviderTabFilter = 'all' | 'connected' | 'attention' | 'unconfigured'

export function computeProviderStatusCategory(
  keys: ApiKey[],
  statusOf: (k: ApiKey) => string
): {
  category: ProviderStatusCategory
  healthyCount: number
  cooldownCount: number
  errorCount: number
} {
  if (keys.length === 0) {
    return { category: 'unconfigured', healthyCount: 0, cooldownCount: 0, errorCount: 0 }
  }

  let healthyCount = 0
  let cooldownCount = 0
  let errorCount = 0
  let enabledCount = 0

  for (const k of keys) {
    if (k.enabled) enabledCount++
    const st = statusOf(k)
    const hasActiveCooldown = (k.cooldowns && k.cooldowns.length > 0) || st === 'degraded'

    if (hasActiveCooldown) {
      cooldownCount++
    } else if (st === 'unhealthy' || st === 'error') {
      errorCount++
    } else if (st === 'healthy' && k.enabled) {
      healthyCount++
    }
  }

  if (cooldownCount > 0 || errorCount > 0) {
    return { category: 'attention', healthyCount, cooldownCount, errorCount }
  }
  if (enabledCount > 0) {
    return { category: 'healthy', healthyCount, cooldownCount, errorCount }
  }
  return { category: 'disabled', healthyCount, cooldownCount, errorCount }
}

/**
 * Sorts provider groups by tactical priority:
 * 1. Healthy & active connected providers
 * 2. Attention-needed (cooldown / error) providers
 * 3. Disabled providers
 * 4. Unconfigured providers
 * Within each tier, sorts by configured key count descending, then alphabetical.
 */
export function sortProviderGroups<T extends { label: string; keys: ApiKey[]; statusCategory: ProviderStatusCategory }>(
  groups: T[]
): T[] {
  const tierWeight: Record<ProviderStatusCategory, number> = {
    healthy: 0,
    attention: 1,
    disabled: 2,
    unconfigured: 3,
  }

  return [...groups].sort((a, b) => {
    const wA = tierWeight[a.statusCategory]
    const wB = tierWeight[b.statusCategory]
    if (wA !== wB) return wA - wB

    // More keys first
    if (b.keys.length !== a.keys.length) {
      return b.keys.length - a.keys.length
    }

    // Alphabetical by label
    return a.label.localeCompare(b.label)
  })
}
