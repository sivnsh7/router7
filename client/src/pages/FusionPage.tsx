import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  Search,
  GitBranch,
  Cpu,
  Layers,
  ArrowRight,
  Sliders,
  Plus,
  X,
  Code,
  Sparkles,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { buildModelOptions } from '@/lib/model-groups'
import { filterFusionModels, fusionProviders } from '@/lib/fusion-filter'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { PageHeader } from '@/components/page-header'
import { FloatingBar } from '@/components/floating-bar'
import { ModelsTabs } from '@/components/models-tabs'
import { RaisedCard, InsetPanel } from '@/components/ui/clay-card'
import { ClayBadge } from '@/components/ui/clay-badge'
import { ClayButton } from '@/components/ui/clay-button'
import { CopyButton } from '@/components/copy-button'
import { useI18n } from '@/i18n'

type Mode = 'auto' | 'explicit'
type Strategy = 'synthesize' | 'best_of'

interface SavedFusionConfig {
  mode: Mode
  models: string[]
  judge: string | null
  k: number
  strategy: Strategy
  expose_panel: boolean
}

interface FusionConfigResponse {
  config: SavedFusionConfig
  maxK: number
}

interface FallbackEntry {
  modelDbId: number
  platform: string
  modelId: string
  displayName: string
  enabled: boolean
  keyCount: number
}

const JUDGE_AUTO = '__auto__'
const PROVIDER_ALL = '__all__'

export default function FusionPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<FusionConfigResponse>({
    queryKey: ['fusion-config'],
    queryFn: () => apiFetch('/api/settings/fusion'),
  })
  const { data: fallbackEntries = [] } = useQuery<FallbackEntry[]>({
    queryKey: ['fallback'],
    queryFn: () => apiFetch('/api/fallback'),
  })

  const { data: unify } = useQuery<{ enabled: boolean }>({
    queryKey: ['unify'],
    queryFn: () => apiFetch('/api/settings/unify'),
  })
  const unifyOn = unify?.enabled ?? true

  const availableModels = useMemo(
    () => fallbackEntries.filter(e => e.keyCount > 0 && e.enabled),
    [fallbackEntries],
  )
  const modelOptions = useMemo(() => buildModelOptions(availableModels, unifyOn), [availableModels, unifyOn])

  const [mode, setMode] = useState<Mode>('auto')
  const [models, setModels] = useState<string[]>([])
  const [judge, setJudge] = useState<string>(JUDGE_AUTO)
  const [k, setK] = useState<number>(4)
  const [strategy, setStrategy] = useState<Strategy>('synthesize')
  const [exposePanel, setExposePanel] = useState<boolean>(false)
  const [panelQuery, setPanelQuery] = useState('')
  const [panelProvider, setPanelProvider] = useState<string>(PROVIDER_ALL)
  const [pickerOpen, setPickerOpen] = useState(false)

  const panelProviders = useMemo(() => fusionProviders(modelOptions), [modelOptions])
  const visibleModels = useMemo(
    () => filterFusionModels(modelOptions, panelQuery, panelProvider === PROVIDER_ALL ? null : panelProvider),
    [modelOptions, panelQuery, panelProvider],
  )

  useEffect(() => {
    if (!data) return
    setMode(data.config.mode)
    setModels(data.config.models)
    setJudge(data.config.judge ?? JUDGE_AUTO)
    setK(data.config.k)
    setStrategy(data.config.strategy)
    setExposePanel(data.config.expose_panel)
  }, [data])

  const maxK = data?.maxK ?? 8

  const saveMutation = useMutation({
    mutationFn: (body: SavedFusionConfig) =>
      apiFetch<FusionConfigResponse>('/api/settings/fusion', { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: (res) => queryClient.setQueryData(['fusion-config'], res),
  })

  const draft: SavedFusionConfig = {
    mode,
    models,
    judge: judge === JUDGE_AUTO ? null : judge,
    k: Math.min(Math.max(k || 1, 1), maxK),
    strategy,
    expose_panel: exposePanel,
  }

  const hasChanges = !!data && JSON.stringify({
    ...data.config,
    judge: data.config.judge ?? null,
  }) !== JSON.stringify(draft)

  const toggleModel = (modelId: string) => {
    setModels(prev => prev.includes(modelId)
      ? prev.filter(m => m !== modelId)
      : (prev.length >= maxK ? prev : [...prev, modelId]))
  }

  const removeModel = (modelId: string) => {
    setModels(prev => prev.filter(m => m !== modelId))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.ensembleComposer') || t('fusion.title')}
        description={t('fusion.description')}
        divider={false}
        actions={<ModelsTabs />}
      />

      {isLoading ? (
        <div className="p-8 text-center text-sm text-ink-mute font-mono">
          {t('common.loading')}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Visual Orchestration Canvas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="size-4 text-clay" />
                <h2 className="text-sm font-mono font-medium tracking-tight text-ink uppercase">
                  Orchestration Pipeline Flow
                </h2>
              </div>
              <ClayBadge variant="status-live" size="sm">
                Active Architecture
              </ClayBadge>
            </div>

            <InsetPanel depth="medium" className="p-4 sm:p-6 bg-paper-2 overflow-x-auto">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 min-w-[700px]">
                
                {/* 1. Ingress Node */}
                <RaisedCard elevation="low" className="p-4 flex-1 border-[2px] border-ink bg-paper-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-ink-mute">
                    <span className="font-semibold text-ink">01. INGRESS</span>
                    <Cpu className="size-3.5 text-ink-soft" />
                  </div>
                  <div className="text-sm font-semibold text-ink">Client Request</div>
                  <div className="rounded bg-paper-2 p-2 font-mono text-[11px] text-ink-soft border border-ink/10 space-y-1">
                    <div className="text-clay font-medium">POST /v1/chat/completions</div>
                    <div className="truncate">model: &quot;fusion&quot;</div>
                  </div>
                  <p className="text-[11px] text-ink-mute">
                    Unified request dispatched to ensemble pipeline.
                  </p>
                </RaisedCard>

                {/* Arrow */}
                <div className="hidden lg:flex flex-col items-center justify-center text-ink-mute px-1">
                  <ArrowRight className="size-4 text-clay" />
                </div>

                {/* 2. Candidate Pool Node */}
                <RaisedCard elevation="medium" className="p-4 flex-[1.4] border-[2.5px] border-ink bg-paper-3 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-semibold text-ink">02. CANDIDATE POOL</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setMode('auto')}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          mode === 'auto'
                            ? 'bg-clay text-white font-bold'
                            : 'bg-paper-2 text-ink-mute hover:text-ink'
                        }`}
                      >
                        Auto (K={k})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('explicit')}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          mode === 'explicit'
                            ? 'bg-clay text-white font-bold'
                            : 'bg-paper-2 text-ink-mute hover:text-ink'
                        }`}
                      >
                        Explicit ({models.length})
                      </button>
                    </div>
                  </div>

                  {mode === 'auto' ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-ink-mute">Top-K Candidate Depth</span>
                        <span className="font-mono font-bold text-clay">{k} models</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="range"
                          min={1}
                          max={maxK}
                          value={k}
                          onChange={e => setK(Number(e.target.value))}
                          className="flex-1 accent-clay cursor-pointer h-2"
                        />
                      </div>
                      <p className="text-[11px] text-ink-mute">
                        Router7 automatically selects the top {k} healthiest models with active keys.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                        {models.length === 0 ? (
                          <div className="text-[11px] font-mono text-ink-mute py-1">
                            No models selected. Choose models below.
                          </div>
                        ) : (
                          models.map(m => {
                            const opt = modelOptions.find(o => o.value === m)
                            return (
                              <span
                                key={m}
                                className="inline-flex items-center gap-1 rounded bg-paper-2 px-2 py-1 text-[11px] font-mono border border-ink/15"
                              >
                                <span className="font-medium text-ink">{opt?.label ?? m}</span>
                                <button
                                  type="button"
                                  onClick={() => removeModel(m)}
                                  className="text-ink-mute hover:text-destructive"
                                >
                                  <X className="size-3" />
                                </button>
                              </span>
                            )
                          })
                        )}
                      </div>
                      <ClayButton
                        type="button"
                        variant="clay-secondary"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => setPickerOpen(open => !open)}
                      >
                        <Plus className="size-3" />
                        {pickerOpen ? 'Close Model Picker' : 'Configure Candidate Models'}
                      </ClayButton>
                    </div>
                  )}
                </RaisedCard>

                {/* Arrow */}
                <div className="hidden lg:flex flex-col items-center justify-center text-ink-mute px-1">
                  <ArrowRight className="size-4 text-clay" />
                </div>

                {/* 3. Evaluator Node */}
                <RaisedCard elevation="medium" className="p-4 flex-[1.2] border-[2.5px] border-ink bg-paper-3 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-semibold text-ink">03. EVALUATOR</span>
                    <Sparkles className="size-3.5 text-clay" />
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-mono text-ink-mute">Strategy</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setStrategy('synthesize')}
                        className={`px-2 py-1.5 rounded text-left text-xs font-mono transition-colors border ${
                          strategy === 'synthesize'
                            ? 'border-clay bg-clay-tint text-clay font-bold'
                            : 'border-ink/10 bg-paper-2 text-ink-mute hover:text-ink'
                        }`}
                      >
                        <div className="font-semibold">Synthesis</div>
                        <div className="text-[10px] opacity-75">Multi-source merge</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStrategy('best_of')}
                        className={`px-2 py-1.5 rounded text-left text-xs font-mono transition-colors border ${
                          strategy === 'best_of'
                            ? 'border-clay bg-clay-tint text-clay font-bold'
                            : 'border-ink/10 bg-paper-2 text-ink-mute hover:text-ink'
                        }`}
                      >
                        <div className="font-semibold">Best-of-N</div>
                        <div className="text-[10px] opacity-75">Judge scored</div>
                      </button>
                    </div>

                    <div className="pt-1">
                      <div className="text-[11px] font-mono text-ink-mute mb-1">Judge Model</div>
                      <Select value={judge} onValueChange={v => setJudge(v ?? JUDGE_AUTO)}>
                        <SelectTrigger className="w-full text-xs font-mono h-8">
                          <SelectValue>
                            {(v: string) => (!v || v === JUDGE_AUTO)
                              ? 'Autonomous Judge (Auto)'
                              : (modelOptions.find(o => o.value === v)?.label ?? v)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={JUDGE_AUTO}>Autonomous Judge (Auto)</SelectItem>
                          {modelOptions.map(o => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label} ({o.providerCount > 1 ? `${o.providerCount} providers` : o.platform})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </RaisedCard>

                {/* Arrow */}
                <div className="hidden lg:flex flex-col items-center justify-center text-ink-mute px-1">
                  <ArrowRight className="size-4 text-clay" />
                </div>

                {/* 4. Output Node */}
                <RaisedCard elevation="low" className="p-4 flex-1 border-[2px] border-ink bg-paper-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-ink-mute">
                    <span className="font-semibold text-ink">04. OUTPUT</span>
                    <Layers className="size-3.5 text-clay" />
                  </div>
                  <div className="text-sm font-semibold text-ink">Aggregated Stream</div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-ink/10">
                    <span className="text-[11px] font-mono text-ink-mute">Expose Panel</span>
                    <Switch checked={exposePanel} onCheckedChange={setExposePanel} />
                  </div>
                  <p className="text-[10px] text-ink-mute leading-tight">
                    {exposePanel ? 'Returns candidate breakdown in response' : 'Returns consolidated answer only'}
                  </p>
                </RaisedCard>

              </div>
            </InsetPanel>
          </div>

          {/* Model Selection Drawer (if explicit mode and picker open) */}
          {mode === 'explicit' && pickerOpen && (
            <RaisedCard elevation="medium" className="p-5 border-[2px] border-ink bg-paper-3 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-ink">Select Candidate Pool Models</h3>
                  <p className="text-xs text-ink-mute">Click models to add or remove them from the pool (max {maxK})</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="rounded p-1 text-ink-mute hover:text-ink"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-mute" />
                  <Input
                    value={panelQuery}
                    onChange={e => setPanelQuery(e.target.value)}
                    placeholder="Search candidate models…"
                    className="pl-8 text-xs font-mono h-9"
                  />
                </div>
                <Select value={panelProvider} onValueChange={v => setPanelProvider(v ?? PROVIDER_ALL)}>
                  <SelectTrigger className="w-full sm:w-48 shrink-0 text-xs font-mono h-9">
                    <SelectValue>
                      {(v: string) => v === PROVIDER_ALL
                        ? 'All Providers'
                        : (panelProviders.find(p => p === v) ?? v)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PROVIDER_ALL}>All Providers</SelectItem>
                    {panelProviders.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-xl border border-ink/20 divide-y divide-ink/10 bg-paper-2">
                {visibleModels.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-ink-mute">No models match your search.</p>
                ) : visibleModels.map(o => {
                  const selected = models.includes(o.value)
                  const atCap = !selected && models.length >= maxK
                  return (
                    <button
                      key={o.value}
                      type="button"
                      disabled={atCap}
                      onClick={() => toggleModel(o.value)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors font-mono ${
                        selected ? 'bg-clay-tint/50 text-clay-dark' : atCap ? 'opacity-40 cursor-not-allowed' : 'hover:bg-ink/5 text-ink'
                      }`}
                    >
                      <span className={`flex size-4 items-center justify-center rounded border border-ink ${selected ? 'bg-clay text-white' : 'bg-paper-3'}`}>
                        {selected && <Check className="size-3" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-xs font-semibold">{o.label}</span>
                        <span className="ml-2 text-[10px] text-ink-mute">{o.value}</span>
                      </span>
                      <ClayBadge variant="capability-chip" size="sm">
                        {o.providerCount > 1 ? `${o.providerCount} providers` : o.platform}
                      </ClayBadge>
                    </button>
                  )
                })}
              </div>
            </RaisedCard>
          )}

          {/* Integration & Developer Quickstart */}
          <div className="grid gap-4 md:grid-cols-2">
            <RaisedCard elevation="low" className="p-4 border-[2px] border-ink bg-paper-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="size-4 text-clay" />
                  <h3 className="text-sm font-mono font-medium text-ink">API Request Format</h3>
                </div>
                <CopyButton
                  text={`curl -X POST http://localhost:8080/v1/chat/completions \\\n  -H "Content-Type: application/json" \\\n  -d '{"model":"fusion","messages":[{"role":"user","content":"Compare and analyze..."}]}'`}
                  label="Copy Curl"
                />
              </div>
              <pre className="overflow-x-auto rounded-lg bg-paper-2 p-3 text-[11px] font-mono leading-relaxed border border-ink/10 text-ink-soft">
{`curl -X POST http://localhost:8080/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "fusion",
    "messages": [{"role": "user", "content": "..."}]
  }'`}
              </pre>
            </RaisedCard>

            <RaisedCard elevation="low" className="p-4 border-[2px] border-ink bg-paper-3 space-y-2">
              <div className="flex items-center gap-2">
                <Sliders className="size-4 text-clay" />
                <h3 className="text-sm font-mono font-medium text-ink">Execution Profile</h3>
              </div>
              <div className="space-y-1.5 text-xs font-mono text-ink-soft">
                <div className="flex justify-between py-1 border-b border-ink/10">
                  <span className="text-ink-mute">Pool Mode:</span>
                  <span className="font-semibold text-ink">{mode.toUpperCase()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-ink/10">
                  <span className="text-ink-mute">Target Pool Size:</span>
                  <span className="font-semibold text-ink">{mode === 'auto' ? `${k} models` : `${models.length} models`}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-ink/10">
                  <span className="text-ink-mute">Consensus Method:</span>
                  <span className="font-semibold text-ink">{strategy === 'synthesize' ? 'Synthesis Merge' : 'Best Candidate Selection'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink-mute">Response Inspection:</span>
                  <span className="font-semibold text-ink">{exposePanel ? 'Exposed in metadata' : 'Silent consolidation'}</span>
                </div>
              </div>
            </RaisedCard>
          </div>
        </div>
      )}

      {/* Floating Save Bar */}
      <FloatingBar show={hasChanges}>
        <span className="text-xs font-mono text-ink-mute">{t('fusion.unsavedChanges')}</span>
        <ClayButton
          size="sm"
          onClick={() => saveMutation.mutate(draft)}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? t('common.loading') : (t('fusion.save') || 'Save Orchestration')}
        </ClayButton>
      </FloatingBar>
    </div>
  )
}
