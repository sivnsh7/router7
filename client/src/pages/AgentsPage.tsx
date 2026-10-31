import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  ExternalLink,
  Search,
  Plug,
  Terminal,
  FileCode,
  ShieldCheck,
  Activity,
  Eye,
  EyeOff,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useI18n } from '@/i18n'
import { PageHeader } from '@/components/page-header'
import { CopyButton } from '@/components/copy-button'
import { AgentIcon } from '@/components/agent-icons'
import { ClayButton } from '@/components/ui/clay-button'
import { ClayBadge } from '@/components/ui/clay-badge'
import { RaisedCard, InsetPanel } from '@/components/ui/clay-card'
import { Input } from '@/components/ui/input'
import toolCatalog from '@/data/agent-tools.json'

interface ClientAnalytics {
  clientAgent: string
  requests: number
  lastSeenAt: string | null
}

interface KeyResponse {
  apiKey: string
}

const analyticsIds: Record<string, string> = {
  claude: 'claude-code',
  codex: 'codex',
  cline: 'cline',
  continue: 'continue',
  aider: 'aider',
  opencode: 'opencode',
  goose: 'goose',
  qwen: 'qwen-code',
  roo: 'roo',
  kilo: 'kilo-code',
  crush: 'crush',
  dsh: 'deepseek-harness',
  mimo: 'mimo-code',
  atomcode: 'atomcode',
  openclaw: 'openclaw',
  hermes: 'hermes-agent',
  cursor: 'cursor',
}

function masked(value: string): string {
  if (value.length < 12) return '••••••••'
  return `${value.slice(0, 8)}${'•'.repeat(12)}${value.slice(-4)}`
}

export default function AgentsPage() {
  const { t } = useI18n()
  const [revealKey, setRevealKey] = useState(false)
  const [selectedId, setSelectedId] = useState<string>(toolCatalog[0]?.id ?? 'claude')
  const [searchQuery, setSearchQuery] = useState('')
  const [setupTab, setSetupTab] = useState<'guided' | 'manual'>('guided')

  const { data: keyData } = useQuery<KeyResponse>({
    queryKey: ['api-key'],
    queryFn: () => apiFetch('/api/settings/api-key'),
  })

  const { data: byClient = [] } = useQuery<ClientAnalytics[]>({
    queryKey: ['analytics', 'by-client', '30d'],
    queryFn: () => apiFetch('/api/analytics/by-client?range=30d'),
  })

  const seenCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  const seen = useMemo(() => {
    return new Map(
      byClient
        .filter(row => row.lastSeenAt && Date.parse(row.lastSeenAt) >= seenCutoff)
        .map(row => [row.clientAgent, row]),
    )
  }, [byClient, seenCutoff])

  const origin = import.meta.env.DEV
    ? `http://${window.location.hostname}:${__SERVER_PORT__}`
    : window.location.origin

  const shownKey = keyData?.apiKey
    ? (revealKey ? keyData.apiKey : masked(keyData.apiKey))
    : '…'

  const filteredTools = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return toolCatalog
    return toolCatalog.filter(tool =>
      tool.name.toLowerCase().includes(q) ||
      tool.id.toLowerCase().includes(q) ||
      tool.protocol.toLowerCase().includes(q),
    )
  }, [searchQuery])

  const activeTool = useMemo(() => {
    return toolCatalog.find(t => t.id === selectedId) ?? toolCatalog[0]
  }, [selectedId])

  const activeTraffic = seen.get(analyticsIds[activeTool?.id ?? ''] ?? activeTool?.id ?? '')
  const activeCommand = `npx router7 ${activeTool?.command ?? 'setup-claude'} --url ${origin}`
  const activeEndpoint = activeTool?.baseUrlSupport === 'root' ? origin : `${origin}/v1`
  const activeRealConnection = `BASE_URL=${activeEndpoint}\nAPI_KEY=${keyData?.apiKey ?? '<unified-key>'}`
  const activeShownConnection = `BASE_URL=${activeEndpoint}\nAPI_KEY=${shownKey}`
  const activeDescriptionKey = `agents.descriptions.${activeTool?.id}`
  const activeDescription = t(activeDescriptionKey) === activeDescriptionKey
    ? `${activeTool?.protocol} · ${activeTool?.baseUrlSupport}`
    : t(activeDescriptionKey)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.integrations') || t('agents.title')}
        description={t('agents.description')}
        actions={
          <ClayButton
            variant="clay-secondary"
            size="sm"
            onClick={() => setRevealKey(v => !v)}
            className="flex items-center gap-1.5"
          >
            {revealKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {revealKey ? t('common.hide') : t('common.show')} {t('agents.apiKey')}
          </ClayButton>
        }
      />

      {/* Gateway Access Overview */}
      <RaisedCard elevation="low" className="p-5 border-[2px] border-ink bg-paper-3 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-clay" />
              <h2 className="text-sm font-mono font-semibold text-ink">Router7 Gateway Endpoint</h2>
            </div>
            <p className="text-xs text-ink-mute">
              All connected clients route through this local proxy instance using your unified gateway key.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ClayBadge variant="status-live" size="sm">
              Endpoint Active
            </ClayBadge>
            <code className="text-xs font-mono bg-paper-2 px-2 py-1 rounded border border-ink/15 text-ink">
              {origin}
            </code>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-ink/10 text-xs font-mono">
          <span className="text-ink-mute">Gateway Access Key:</span>
          <code className="bg-paper-2 px-2 py-0.5 rounded border border-ink/10 text-ink-soft select-all">
            {shownKey}
          </code>
          {keyData?.apiKey && (
            <CopyButton
              text={keyData.apiKey}
              className="size-6 shrink-0"
              label={t('common.copy')}
            />
          )}
        </div>
      </RaisedCard>

      {/* Integrations Master-Detail Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Client Registry Matrix (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plug className="size-4 text-clay" />
              <h3 className="text-xs font-mono font-semibold uppercase text-ink">
                Client Registry ({filteredTools.length})
              </h3>
            </div>
            {seen.size > 0 && (
              <ClayBadge variant="status-live" size="sm">
                {seen.size} active
              </ClayBadge>
            )}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-mute" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter clients & tools…"
              className="pl-8 text-xs font-mono h-8 bg-paper-2 border-ink/20"
            />
          </div>

          <InsetPanel depth="shallow" className="p-1.5 space-y-1 max-h-[580px] overflow-y-auto bg-paper-2">
            {filteredTools.length === 0 ? (
              <div className="p-4 text-center text-xs font-mono text-ink-mute">
                No integrations match your search.
              </div>
            ) : (
              filteredTools.map(tool => {
                const traffic = seen.get(analyticsIds[tool.id] ?? tool.id)
                const isSelected = tool.id === selectedId
                const toolDesc = t(`agents.descriptions.${tool.id}`)
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => setSelectedId(tool.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all font-mono ${
                      isSelected
                        ? 'bg-paper-3 border-[2px] border-ink shadow-sh1 -translate-y-0.5'
                        : 'border border-transparent hover:bg-ink/5 hover:border-ink/15 text-ink'
                    }`}
                  >
                    <AgentIcon id={tool.id} name={tool.name} className="size-7 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold truncate text-ink">{tool.name}</span>
                        {traffic ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Connected
                          </span>
                        ) : (
                          <span className="text-[10px] text-ink-mute shrink-0">
                            Ready
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-ink-mute truncate mt-0.5">
                        {toolDesc !== `agents.descriptions.${tool.id}` ? toolDesc : tool.protocol}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </InsetPanel>
        </div>

        {/* Right Column: Integration Workbench & Configuration Inspector (7 cols) */}
        <div className="lg:col-span-7">
          {activeTool ? (
            <RaisedCard elevation="medium" className="p-6 border-[2.5px] border-ink bg-paper-3 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-ink/10">
                <div className="flex items-center gap-3">
                  <AgentIcon id={activeTool.id} name={activeTool.name} className="size-10 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-ink">{activeTool.name}</h2>
                      <ClayBadge variant="capability-chip" size="sm">
                        {activeTool.protocol}
                      </ClayBadge>
                    </div>
                    <p className="text-xs text-ink-mute mt-0.5">
                      {activeDescription}
                    </p>
                  </div>
                </div>

                <a
                  href={activeTool.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-ink-mute hover:text-clay transition-colors font-mono shrink-0"
                >
                  <span>{t('agents.documentation')}</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>

              {/* Status & Telemetry Pill */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-paper-2 border border-ink/10 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <Activity className="size-3.5 text-clay" />
                  <span className="text-ink-mute">Connection Status:</span>
                  {activeTraffic ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <CheckCircle2 className="size-3" /> Active ({activeTraffic.requests} requests)
                    </span>
                  ) : (
                    <span className="text-ink-mute">No traffic recorded yet</span>
                  )}
                </div>
                {activeTraffic?.lastSeenAt && (
                  <span className="text-[11px] text-ink-mute">
                    Last active: {new Date(activeTraffic.lastSeenAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Setup Mode Switcher */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-ink/10 pb-2">
                  <button
                    type="button"
                    onClick={() => setSetupTab('guided')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                      setupTab === 'guided'
                        ? 'bg-clay text-white shadow-sh1 font-bold'
                        : 'text-ink-mute hover:text-ink hover:bg-ink/5'
                    }`}
                  >
                    <Terminal className="size-3.5" />
                    Guided CLI Setup
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetupTab('manual')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                      setupTab === 'manual'
                        ? 'bg-clay text-white shadow-sh1 font-bold'
                        : 'text-ink-mute hover:text-ink hover:bg-ink/5'
                    }`}
                  >
                    <FileCode className="size-3.5" />
                    Manual Environment
                  </button>
                </div>

                {setupTab === 'guided' ? (
                  <div className="space-y-4 pt-1">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-mono font-semibold text-ink">
                        <span className="flex size-4 items-center justify-center rounded-full bg-clay text-white text-[10px]">1</span>
                        <span>Run Automated Configuration Command</span>
                      </div>
                      <p className="text-xs text-ink-mute pl-6">
                        Execute this command in your project terminal to automatically configure {activeTool.name} to route requests through Router7:
                      </p>
                      <div className="flex items-center gap-2 rounded-xl bg-paper-2 border border-ink/15 px-3 py-2.5 font-mono text-xs">
                        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-ink">
                          {activeCommand}
                        </code>
                        <CopyButton
                          text={activeCommand}
                          className="size-7 shrink-0"
                          label={t('common.copy')}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-mono font-semibold text-ink">
                        <span className="flex size-4 items-center justify-center rounded-full bg-clay text-white text-[10px]">2</span>
                        <span>Start Prompting in {activeTool.name}</span>
                      </div>
                      <p className="text-xs text-ink-mute pl-6">
                        Once executed, {activeTool.name} will immediately route prompt and completion requests through Router7 gateway policies and fallback chains.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <p className="text-xs text-ink-mute">
                      To manually configure {activeTool.name}, export the following environment variables or add them to your client configuration:
                    </p>
                    <div className="rounded-xl bg-paper-2 border border-ink/15 p-3 font-mono text-xs space-y-2">
                      <div className="flex items-center justify-between text-ink-mute text-[10px] pb-1 border-b border-ink/10">
                        <span>ENVIRONMENT VARIABLES</span>
                        <CopyButton
                          text={activeRealConnection}
                          className="size-6 shrink-0"
                          label={t('common.copy')}
                        />
                      </div>
                      <pre className="text-ink leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                        {activeShownConnection}
                      </pre>
                    </div>
                    <div className="text-[11px] font-mono text-ink-mute">
                      Endpoint wire format: <span className="font-semibold text-ink">{activeTool.baseUrlSupport}</span>
                    </div>
                  </div>
                )}
              </div>
            </RaisedCard>
          ) : null}
        </div>
      </div>
    </div>
  )
}
