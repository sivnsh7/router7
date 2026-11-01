import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { ClayButton, buttonVariants } from '@/components/ui/clay-button'
import { ConfirmButton } from '@/components/confirm-button'
import { ClayInput } from '@/components/ui/clay-input'
import { Switch } from '@/components/ui/switch'
import { ClayBadge } from '@/components/ui/clay-badge'
import { RaisedCard } from '@/components/ui/clay-card'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { EmptyState } from '@/components/empty-state'
import { TableSkeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, ExternalLink, FlaskConical, KeyRound, MoreHorizontal, Plus, RotateCcw, Search, Sparkles } from 'lucide-react'
import type { ApiKey } from '../../../../shared/types'
import { useI18n } from '@/i18n'
import { toast } from '@/lib/toast'
import { keyMatchesQuery } from '@/lib/key-search'
import {
  PLATFORMS,
  CUSTOM_GROUP,
} from './shared'
import type { HealthData } from './shared'
import { DiscoverModelsDialog } from './discover-models-dialog'
import { AddEndpointKeyDialog } from './add-endpoint-key-dialog'
import { CopyKeyDialog } from './copy-key-dialog'
import { EditKeyDialog } from './edit-key-dialog'
import { EditModelsDialog } from './edit-models-dialog'
import { ModelScopeDialog } from './model-scope-dialog'
import { TestModelsDialog } from './test-models-dialog'
import { AddModelDialog } from './add-model-dialog'
import { computeProviderStatusCategory, sortProviderGroups } from '@/lib/provider-sorting'
import { ProviderCredentialsCard } from './provider-credentials-card'
import { ProviderModelsCard } from './provider-models-card'

type StatusFilter = 'all' | 'healthy' | 'issues' | 'disabled'
type BulkAction = 'enable' | 'disable' | 'delete'

export function ProviderList({ onAddKey }: { onAddKey: () => void }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const [editingKeyId, setEditingKeyId] = useState<number | null>(null)
  const [groupOverrides, setGroupOverrides] = useState<Map<string, boolean>>(new Map())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [discoverTarget, setDiscoverTarget] = useState<{ keyId: number; builtin: boolean } | null>(null)
  const [addKeyBaseUrl, setAddKeyBaseUrl] = useState<string | null>(null)
  const [copyKey, setCopyKey] = useState<{ id: number; maskedKey: string } | null>(null)
  const [scopeKeyId, setScopeKeyId] = useState<number | null>(null)
  const [modelEditorKeyId, setModelEditorKeyId] = useState<number | null>(null)
  const [selectedKeyIds, setSelectedKeyIds] = useState<Set<number>>(new Set())
  const [testTarget, setTestTarget] = useState<{ platform: string; keyId?: number; label: string } | null>(null)
  const [addModelTarget, setAddModelTarget] = useState<{ platform: string; keyId?: number } | null>(null)

  const { data: keys = [], isLoading } = useQuery<ApiKey[]>({
    queryKey: ['keys'],
    queryFn: () => apiFetch('/api/keys'),
  })

  const { data: healthData } = useQuery<HealthData>({
    queryKey: ['health'],
    queryFn: () => apiFetch('/api/health'),
    refetchInterval: 30000,
  })

  const { data: proxyData } = useQuery<{ proxyUrl: string; enabled: boolean; bypassPlatforms: string[]; active: boolean }>({
    queryKey: ['proxy-url'],
    queryFn: () => apiFetch('/api/settings/proxy'),
  })
  const bypassPlatforms = proxyData?.bypassPlatforms ?? []
  const proxyEnabled = proxyData?.enabled ?? true

  const deleteKey = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/keys/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
      queryClient.invalidateQueries({ queryKey: ['keys-providers'] })
    },
  })

  const probeKey = useMutation({
    meta: { silenceToast: true },
    mutationFn: (keyId: number) =>
      apiFetch<{ modelId: string; latencyMs: number; reasoning?: boolean; toolCalls?: boolean }>(`/api/keys/custom/probe`, {
        method: 'POST',
        body: JSON.stringify({ keyId }),
      }),
    onSuccess: (data) => {
      for (const key of ['keys', 'health', 'fallback']) {
        queryClient.invalidateQueries({ queryKey: [key] })
      }
      queryClient.invalidateQueries({ queryKey: ['fallback', 'routing'] })
      toast.success(
        `${t('keys.probeSuccess', { model: data.modelId, latency: data.latencyMs })}`
      )
    },
    onError: (error) => {
      toast.error(t('keys.probeFailed', { reason: error instanceof Error ? error.message : String(error) }))
    },
  })

  const clearPlatformCooldowns = useMutation({
    mutationFn: (platform: string) =>
      apiFetch<{ cleared: number; keysCount: number }>(`/api/keys/platform/${platform}/cooldowns`, {
        method: 'DELETE',
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['keys'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
      queryClient.invalidateQueries({ queryKey: ['fallback'] })
      toast.success(`Cleared ${data.cleared} active cooldowns across ${data.keysCount} keys`)
    },
    onError: (err) => {
      toast.error(`Failed to clear cooldowns: ${err instanceof Error ? err.message : String(err)}`)
    },
  })

  const togglePlatform = useMutation({
    mutationFn: ({ platform, enabled }: { platform: string; enabled: boolean }) =>
      apiFetch(`/api/keys/platform/${platform}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
      queryClient.invalidateQueries({ queryKey: ['fallback'] })
    },
  })

  const setKeyEnabled = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      apiFetch(`/api/keys/${id}`, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
      queryClient.invalidateQueries({ queryKey: ['fallback'] })
    },
  })

  const bulkKeys = useMutation({
    meta: { silenceToast: true },
    mutationFn: async ({ ids, action }: { ids: number[]; action: BulkAction }) => {
      const results = await Promise.allSettled(ids.map(id =>
        action === 'delete'
          ? apiFetch(`/api/keys/${id}`, { method: 'DELETE' })
          : apiFetch(`/api/keys/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ enabled: action === 'enable' }),
          }),
      ))
      return {
        action,
        done: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length,
      }
    },
    onSuccess: ({ action, done, failed }) => {
      for (const key of ['keys', 'health', 'fallback']) {
        queryClient.invalidateQueries({ queryKey: [key] })
      }
      if (action === 'delete') queryClient.invalidateQueries({ queryKey: ['keys-providers'] })
      const summary = action === 'delete'
        ? t('keys.bulkDeleteResult', { done, failed })
        : t('keys.bulkResult', { done, failed })
      if (failed > 0) toast.error(summary)
      else toast.success(summary)
    },
  })

  const toggleBypass = useMutation({
    mutationFn: (platform: string) => {
      const next = bypassPlatforms.includes(platform)
        ? bypassPlatforms.filter(p => p !== platform)
        : [...bypassPlatforms, platform]
      return apiFetch('/api/settings/proxy', { method: 'PUT', body: JSON.stringify({ bypassPlatforms: next }) })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proxy-url'] }),
  })

  function startEditing(key: ApiKey) {
    setEditingKeyId(key.id)
  }

  const healthKeyMap = new Map<number, { status: string; lastCheckedAt: string | null; lastHealthError: string | null }>()
  for (const k of healthData?.keys ?? []) healthKeyMap.set(k.id, k)
  const statusOf = (k: ApiKey) => healthKeyMap.get(k.id)?.status ?? k.status

  // Group keys by provider and compute status categories
  const grouped = [...PLATFORMS, CUSTOM_GROUP].map(p => {
    const groupKeys = keys.filter(k => k.platform === p.value)
    const { category, healthyCount, cooldownCount, errorCount } = computeProviderStatusCategory(groupKeys, statusOf)
    return {
      ...p,
      keys: groupKeys,
      statusCategory: category,
      healthyCount,
      cooldownCount,
      errorCount,
    }
  }).filter(p => p.keys.length > 0)

  // Apply tactical priority sorting
  const sortedGrouped = sortProviderGroups(grouped)

  const totalProviders = sortedGrouped.length
  const totalKeys = sortedGrouped.reduce((n, g) => n + g.keys.length, 0)
  const totalHealthy = sortedGrouped.filter(g => g.statusCategory === 'healthy').length
  const totalAttention = sortedGrouped.filter(g => g.statusCategory === 'attention').length
  const totalDisabled = sortedGrouped.filter(g => g.statusCategory === 'disabled').length

  const q = search.trim().toLowerCase()

  function matchStatus(group: (typeof sortedGrouped)[number]): boolean {
    switch (statusFilter) {
      case 'healthy': return group.statusCategory === 'healthy'
      case 'issues': return group.statusCategory === 'attention'
      case 'disabled': return group.statusCategory === 'disabled'
      default: return true
    }
  }

  const visibleGroups = sortedGrouped
    .map(group => {
      if (!q) return group
      if (group.label.toLowerCase().includes(q)) return group
      const matchingKeys = group.keys.filter(k => keyMatchesQuery(k, q))
      return { ...group, keys: matchingKeys }
    })
    .filter(group => group.keys.length > 0 && matchStatus(group))

  function isGroupExpanded(group: (typeof sortedGrouped)[number]): boolean {
    if (q) return true
    const override = groupOverrides.get(group.value)
    if (override !== undefined) return override
    return group.statusCategory === 'attention' || visibleGroups.length <= 2
  }

  function toggleGroup(value: string, expanded: boolean) {
    setGroupOverrides(prev => {
      const next = new Map(prev)
      next.set(value, !expanded)
      return next
    })
  }

  if (isLoading) return <TableSkeleton rows={4} />

  if (keys.length === 0) {
    return (
      <EmptyState
        icon={KeyRound}
        title={t('keys.noProviderKeys')}
        action={
          <ClayButton size="sm" onClick={onAddKey}>
            <Plus className="size-3.5" />
            {t('keys.addKey')}
          </ClayButton>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Segmented Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-paper-2 p-2.5 rounded-xl border-[2px] border-ink shadow-sh1">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-mute" />
          <ClayInput
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search provider, model, key..."
            className="h-8 pl-8 text-xs font-mono"
          />
        </div>

        <SegmentedControl
          value={statusFilter}
          onValueChange={setStatusFilter}
          options={[
            { value: 'all', label: `All (${totalProviders})` },
            { value: 'healthy', label: `Healthy (${totalHealthy})` },
            { value: 'issues', label: `Attention (${totalAttention})` },
            { value: 'disabled', label: `Disabled (${totalDisabled})` },
          ]}
          ariaLabel="Filter providers by status"
        />

        <div className="font-mono text-xs text-ink-mute">
          <span className="font-bold text-ink">{totalKeys}</span> keys / <span className="font-bold text-ink">{totalProviders}</span> active gateways
        </div>
      </div>

      {visibleGroups.length === 0 ? (
        <EmptyState title="No providers match the selected filter." />
      ) : (
        <div className="space-y-4">
          {visibleGroups.map(group => {
            const expanded = isGroupExpanded(group)
            const hasCooldowns = group.cooldownCount > 0

            return (
              <RaisedCard
                key={group.value}
                elevation="low"
                className="p-3 border-[2.5px] border-ink bg-paper-3 transition-all"
              >
                {/* Tactical Provider Header Ribbon */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Switch
                      checked={group.keys.some(k => k.enabled)}
                      onCheckedChange={(checked) =>
                        togglePlatform.mutate({ platform: group.value, enabled: checked })
                      }
                      disabled={togglePlatform.isPending}
                      aria-label={`Toggle platform ${group.label}`}
                    />

                    <button
                      type="button"
                      onClick={() => toggleGroup(group.value, expanded)}
                      className="flex items-center gap-2 text-left min-w-0 group/hdr"
                      aria-expanded={expanded}
                    >
                      <h3 className="font-mono text-sm font-bold text-ink group-hover/hdr:text-clay transition-colors truncate">
                        {group.label}
                      </h3>

                      <ClayBadge variant="model-badge" size="sm">
                        {group.keys.length} {group.keys.length === 1 ? 'KEY' : 'KEYS'}
                      </ClayBadge>

                      {group.healthyCount > 0 && (
                        <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          {group.healthyCount} OK
                        </span>
                      )}

                      {group.cooldownCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded font-mono text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 animate-pulse">
                          ⏱ {group.cooldownCount} COOLDOWN
                        </span>
                      )}

                      {group.errorCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded font-mono text-[10px] bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300">
                          ! {group.errorCount} ATTENTION
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Quick Platform Reset Cooldowns */}
                    {hasCooldowns && (
                      <ClayButton
                        size="xs"
                        variant="clay-secondary"
                        onClick={() => clearPlatformCooldowns.mutate(group.value)}
                        disabled={clearPlatformCooldowns.isPending}
                        title="Clear all cooldowns for this provider"
                        className="flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400"
                      >
                        <RotateCcw className={`size-3 ${clearPlatformCooldowns.isPending ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Reset Cooldowns</span>
                      </ClayButton>
                    )}

                    {/* Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={buttonVariants({ variant: 'ghost', size: 'icon-xs' })}
                        aria-label="Provider actions"
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        {group.value !== 'custom' && (
                          <DropdownMenuItem onClick={() => setTestTarget({ platform: group.value, label: group.label })}>
                            <span>Test All Models</span>
                            <FlaskConical className="ml-auto size-3.5" />
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setAddModelTarget({ platform: group.value })}>
                          <span>Add Custom Model</span>
                          <Sparkles className="ml-auto size-3.5" />
                        </DropdownMenuItem>
                        {group.url && (
                          <DropdownMenuItem onClick={() => window.open(group.url, '_blank', 'noopener,noreferrer')}>
                            <span>Official API Keys</span>
                            <ExternalLink className="ml-auto size-3.5" />
                          </DropdownMenuItem>
                        )}
                        {proxyEnabled && (
                          <DropdownMenuCheckboxItem
                            checked={!bypassPlatforms.includes(group.value)}
                            onCheckedChange={() => toggleBypass.mutate(group.value)}
                            closeOnClick={false}
                          >
                            <span>Route via Proxy</span>
                          </DropdownMenuCheckboxItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Expand/Collapse Chevron */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.value, expanded)}
                      aria-label={expanded ? 'Hide provider details' : 'Show provider details'}
                      className={buttonVariants({ variant: 'ghost', size: 'icon-xs' })}
                    >
                      <ChevronDown className={`size-4 text-ink-mute transition-transform ${expanded ? '' : '-rotate-90'}`} />
                    </button>
                  </div>
                </div>

                {/* Bulk Action Bar */}
                {(() => {
                  const groupSelected = group.keys.filter(k => selectedKeyIds.has(k.id))
                  if (groupSelected.length === 0) return null
                  const clearGroup = () => setSelectedKeyIds(prev => {
                    const next = new Set(prev)
                    groupSelected.forEach(k => next.delete(k.id))
                    return next
                  })
                  const bulk = (action: BulkAction) => {
                    bulkKeys.mutate({ ids: groupSelected.map(k => k.id), action })
                    clearGroup()
                  }
                  return (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border-[1.5px] border-ink bg-paper px-3 py-1.5 text-xs font-mono">
                      <span className="text-ink-mute">{groupSelected.length} selected:</span>
                      <ClayButton size="xs" variant="outline" disabled={bulkKeys.isPending} onClick={() => bulk('enable')}>
                        Enable
                      </ClayButton>
                      <ClayButton size="xs" variant="outline" disabled={bulkKeys.isPending} onClick={() => bulk('disable')}>
                        Disable
                      </ClayButton>
                      <ConfirmButton
                        variant="outline"
                        size="xs"
                        confirmLabel={`Delete ${groupSelected.length}?`}
                        onConfirm={() => bulk('delete')}
                        disabled={bulkKeys.isPending}
                      >
                        Delete
                      </ConfirmButton>
                      <ClayButton size="xs" variant="ghost" onClick={clearGroup}>
                        Dismiss
                      </ClayButton>
                    </div>
                  )
                })()}

                {/* Expanded Two-Column Tactical Field Dossier */}
                {expanded && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3 pt-3 border-t-[1.5px] border-ink/15">
                    {/* Card A: Credentials & Connection Vault */}
                    <ProviderCredentialsCard
                      platform={group.value}
                      keys={group.keys}
                      statusOf={statusOf}
                      healthKeyMap={healthKeyMap}
                      onAddKey={() => group.value === 'custom' ? setAddKeyBaseUrl(group.keys[0]?.baseUrl ?? null) : onAddKey()}
                      onEditKey={startEditing}
                      onCopyKey={setCopyKey}
                      onDeleteKey={(id) => deleteKey.mutate(id)}
                      onToggleKey={(id, enabled) => setKeyEnabled.mutate({ id, enabled })}
                      onProbeKey={(id) => probeKey.mutate(id)}
                      isProbing={probeKey.isPending}
                      probingKeyId={probeKey.variables}
                      selectedKeyIds={selectedKeyIds}
                      onToggleSelectKey={(id) => setSelectedKeyIds(prev => {
                        const next = new Set(prev)
                        if (next.has(id)) next.delete(id)
                        else next.add(id)
                        return next
                      })}
                    />

                    {/* Card B: Served Models & Intelligence Matrix */}
                    <ProviderModelsCard
                      platform={group.value}
                      keyId={group.keys[0]?.id}
                      onAddModel={() => setAddModelTarget({ platform: group.value, keyId: group.keys[0]?.id })}
                      onDiscoverModels={group.keys[0]?.modelDiscovery ? () => setDiscoverTarget({ keyId: group.keys[0].id, builtin: group.value !== 'custom' }) : undefined}
                      hasActiveKey={group.keys.some(k => k.enabled && statusOf(k) === 'healthy')}
                    />
                  </div>
                )}
              </RaisedCard>
            )
          })}
        </div>
      )}

      {/* Dialogs */}
      {discoverTarget !== null && (
        <DiscoverModelsDialog
          open
          endpoint={{ keyId: discoverTarget.keyId }}
          builtin={discoverTarget.builtin}
          onOpenChange={(open) => { if (!open) setDiscoverTarget(null) }}
        />
      )}

      {addKeyBaseUrl !== null && (
        <AddEndpointKeyDialog
          open
          baseUrl={addKeyBaseUrl}
          onOpenChange={(open) => { if (!open) setAddKeyBaseUrl(null) }}
        />
      )}

      {testTarget !== null && (
        <TestModelsDialog
          platform={testTarget.platform}
          keyId={testTarget.keyId}
          label={testTarget.label}
          onOpenChange={(open) => { if (!open) setTestTarget(null) }}
        />
      )}

      {addModelTarget !== null && (
        <AddModelDialog
          open
          initialPlatform={addModelTarget.platform}
          initialKeyId={addModelTarget.keyId}
          onOpenChange={(open) => { if (!open) setAddModelTarget(null) }}
        />
      )}

      {copyKey !== null && (
        <CopyKeyDialog
          keyId={copyKey.id}
          maskedKey={copyKey.maskedKey}
          onOpenChange={(open) => { if (!open) setCopyKey(null) }}
        />
      )}

      {(() => {
        const scopeKey = scopeKeyId !== null ? keys.find(k => k.id === scopeKeyId) : undefined
        return scopeKey ? (
          <ModelScopeDialog
            apiKey={scopeKey}
            onOpenChange={(open) => { if (!open) setScopeKeyId(null) }}
          />
        ) : null
      })()}

      {(() => {
        const modelKey = modelEditorKeyId !== null ? keys.find(k => k.id === modelEditorKeyId) : undefined
        return modelKey ? (
          <EditModelsDialog
            apiKey={modelKey}
            onOpenChange={(open) => { if (!open) setModelEditorKeyId(null) }}
          />
        ) : null
      })()}

      {(() => {
        const editKey = editingKeyId !== null ? keys.find(k => k.id === editingKeyId) : undefined
        return editKey ? (
          <EditKeyDialog
            apiKey={editKey}
            onOpenChange={(open) => { if (!open) setEditingKeyId(null) }}
          />
        ) : null
      })()}
    </div>
  )
}
