import { useState, useMemo } from 'react'
import { Cpu, Search, Sparkles, Zap, Eye, Wrench, Brain } from 'lucide-react'
import { ClayButton } from '@/components/ui/clay-button'
import { Switch } from '@/components/ui/switch'
import { apiFetch } from '@/lib/api'
import { toast } from '@/lib/toast'
import type { Model } from '../../../../shared/types'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface ProviderModelsCardProps {
  platform: string
  keyId?: number
  onAddModel: () => void
  onDiscoverModels?: () => void
  hasActiveKey: boolean
}

type ThinkingLevel = 'auto' | 'low' | 'medium' | 'high' | 'max'

export function ProviderModelsCard({
  platform,
  keyId,
  onAddModel,
  onDiscoverModels,
  hasActiveKey,
}: ProviderModelsCardProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [thinkingLevel, setThinkingLevel] = useState<ThinkingLevel>('auto')
  const [modelTestState, setModelTestState] = useState<Record<number, { loading: boolean; latencyMs?: number; error?: string }>>({})

  const { data: allModels = [] } = useQuery<Model[]>({
    queryKey: ['models'],
    queryFn: () => apiFetch('/api/models'),
  })

  // Filter models for this platform (or keyId if custom)
  const platformModels = useMemo(() => {
    return allModels.filter(m => {
      if (platform === 'custom') {
        return keyId ? m.keyId === keyId : m.platform === 'custom'
      }
      return m.platform === platform
    })
  }, [allModels, platform, keyId])

  // Filter by search term
  const filteredModels = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return platformModels
    return platformModels.filter(m =>
      m.modelId.toLowerCase().includes(q) ||
      (m.displayName && m.displayName.toLowerCase().includes(q))
    )
  }, [platformModels, search])

  // Toggle model enabled/disabled mutation
  const toggleModel = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      apiFetch(`/api/models/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] })
      queryClient.invalidateQueries({ queryKey: ['fallback'] })
    },
  })

  // Test single model
  const runModelTest = async (model: Model) => {
    setModelTestState(prev => ({ ...prev, [model.id]: { loading: true } }))
    try {
      const res = await apiFetch<{ success: boolean; latencyMs: number; error?: string }>(
        `/api/models/${model.id}/test`,
        { method: 'POST' }
      )
      if (res.success) {
        setModelTestState(prev => ({
          ...prev,
          [model.id]: { loading: false, latencyMs: res.latencyMs },
        }))
        toast.success(`${model.displayName || model.modelId}: ${res.latencyMs}ms`)
      } else {
        setModelTestState(prev => ({
          ...prev,
          [model.id]: { loading: false, error: res.error || 'Failed' },
        }))
        toast.error(res.error || 'Model test failed')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setModelTestState(prev => ({
        ...prev,
        [model.id]: { loading: false, error: msg },
      }))
      toast.error(msg)
    }
  }

  return (
    <div className="flex flex-col h-full rounded-xl border-[2px] border-ink bg-paper-2 overflow-hidden shadow-sh1">
      {/* Tactical Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-paper-3 border-b-[2px] border-ink">
        <div className="flex items-center gap-2">
          <Cpu className="size-4 text-clay" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
            Intelligence Matrix
          </span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-paper border border-ink/20 text-ink-mute">
            {platformModels.length}
          </span>
        </div>

        {/* Thinking Level Selector & Add Model */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-paper border border-ink/20 rounded-md px-1.5 py-0.5">
            <Brain className="size-3 text-clay" />
            <select
              value={thinkingLevel}
              onChange={(e) => {
                const val = e.target.value as ThinkingLevel
                setThinkingLevel(val)
                toast.success(`Thinking Level set to ${val.toUpperCase()}`)
              }}
              title="Default reasoning thinking budget for this provider"
              className="bg-transparent font-mono text-[10px] text-ink focus:outline-none cursor-pointer"
            >
              <option value="auto">Thinking: Auto</option>
              <option value="low">Thinking: Low</option>
              <option value="medium">Thinking: Medium</option>
              <option value="high">Thinking: High</option>
              <option value="max">Thinking: Max</option>
            </select>
          </div>

          <ClayButton
            size="xs"
            variant="clay-secondary"
            onClick={onAddModel}
            className="flex items-center gap-1 text-[11px]"
          >
            <Sparkles className="size-3" />
            <span>Add Model</span>
          </ClayButton>
        </div>
      </div>

      {/* Model Filter Bar */}
      <div className="p-2 border-b border-ink/10 bg-paper/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-ink-mute" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter models or capabilities..."
            className="w-full pl-7 pr-3 py-1 bg-paper rounded border border-ink/20 text-xs font-mono text-ink placeholder:text-ink-mute/60 focus:outline-none focus:border-clay"
          />
        </div>
      </div>

      {/* Models List */}
      <div className="flex-1 p-2.5 space-y-2 overflow-y-auto">
        {filteredModels.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-ink-mute space-y-2">
            <Cpu className="size-8 stroke-1 text-ink-mute/50" />
            <p className="text-xs font-mono">
              {platformModels.length === 0 ? 'No models registered yet.' : 'No models match filter.'}
            </p>
            {onDiscoverModels && (
              <ClayButton size="xs" onClick={onDiscoverModels}>
                Discover Models
              </ClayButton>
            )}
          </div>
        ) : (
          filteredModels.map((m) => {
            const testState = modelTestState[m.id]
            const isTesting = testState?.loading
            const latency = testState?.latencyMs

            return (
              <div
                key={m.id}
                className={`p-2 rounded-lg border transition-all ${
                  m.enabled
                    ? 'border-ink/20 bg-paper hover:border-ink/40'
                    : 'border-ink/10 bg-paper/40 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-ink truncate" title={m.modelId}>
                        {m.displayName || m.modelId}
                      </span>
                      {m.displayName && m.displayName !== m.modelId && (
                        <span className="font-mono text-[10px] text-ink-mute truncate">
                          ({m.modelId})
                        </span>
                      )}
                    </div>

                    {/* Capability Badges */}
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {m.supportsVision && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-mono bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300">
                          <Eye className="size-2.5" />
                          VISION
                        </span>
                      )}
                      {m.supportsTools && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-mono bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300">
                          <Wrench className="size-2.5" />
                          TOOLS
                        </span>
                      )}
                      {m.contextWindow && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-paper-3 border border-ink/15 text-ink-mute">
                          {Math.round(m.contextWindow / 1024)}k ctx
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions: Ping Probe, Enabled Switch */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Live Ping Probe */}
                    <button
                      type="button"
                      onClick={() => runModelTest(m)}
                      disabled={isTesting || !hasActiveKey}
                      title={hasActiveKey ? 'Ping model latency' : 'Requires configured active key'}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-paper hover:bg-clay-tint border border-ink/20 hover:border-clay text-ink transition-colors disabled:opacity-40"
                    >
                      <Zap className={`size-2.5 text-clay ${isTesting ? 'animate-spin' : ''}`} />
                      {isTesting ? (
                        <span>...</span>
                      ) : latency != null ? (
                        <span className="text-emerald-600 font-bold">{latency}ms</span>
                      ) : testState?.error ? (
                        <span className="text-rose-600 font-bold">Err</span>
                      ) : (
                        <span>Ping</span>
                      )}
                    </button>

                    {/* Enable/Disable Switch */}
                    <Switch
                      size="sm"
                      checked={m.enabled}
                      onCheckedChange={(checked) => toggleModel.mutate({ id: m.id, enabled: checked })}
                      aria-label="Toggle model enabled"
                    />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
