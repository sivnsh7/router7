import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownToLine, Pause, Play, ScrollText, Trash2, Activity, Terminal } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { ConfirmButton } from '@/components/confirm-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { RaisedCard, InsetPanel } from '@/components/ui/clay-card'
import { ClayButton } from '@/components/ui/clay-button'
import { apiFetch } from '@/lib/api'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n'
import {
  advanceCursor,
  buildLogsQuery,
  clampMessage,
  collectProviders,
  DEFAULT_LOG_LEVELS,
  EMPTY_LOG_COUNTS,
  formatLogTime,
  isLongMessage,
  levelsCsv,
  LOG_BUFFER_LIMIT,
  LOG_LEVELS,
  LOG_PAGE_LIMIT,
  LOG_POLL_MS,
  mergeEntries,
  toggleLevel,
  type LogCounts,
  type LogEntry,
  type LogLevel,
  type LogsResponse,
} from '@/lib/logs'

const SEARCH_DEBOUNCE_MS = 300
const SCROLL_FOLLOW_SLACK = 40

const LEVEL_CLASS: Record<LogLevel, string> = {
  debug: 'bg-muted text-muted-foreground',
  info: 'bg-sky-600/15 text-sky-700 dark:text-sky-400 border-sky-500/20',
  warn: 'bg-amber-600/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
  error: 'bg-destructive/15 text-destructive border-destructive/30',
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-paper-2 border border-ink/10 px-1.5 py-0.5 text-[10px] font-mono text-ink-mute">
      {children}
    </span>
  )
}

function LogRow({
  entry,
  expanded,
  onToggleExpand,
  expandLabel,
  collapseLabel,
}: {
  entry: LogEntry
  expanded: boolean
  onToggleExpand: () => void
  expandLabel: string
  collapseLabel: string
}) {
  const long = isLongMessage(entry.message)
  return (
    <div
      data-log-level={entry.level}
      className="flex items-start gap-2.5 rounded-md px-2 py-1.5 font-mono text-[11px] leading-relaxed hover:bg-ink/5 transition-colors border-b border-ink/5 last:border-0"
    >
      <span className="shrink-0 tabular-nums text-ink-mute text-[10px] pt-0.5">{formatLogTime(entry.ts)}</span>
      <Badge
        variant="secondary"
        className={cn('h-4 shrink-0 rounded px-1.5 font-mono text-[9px] uppercase border', LEVEL_CLASS[entry.level])}
      >
        {entry.level}
      </Badge>
      <div className="min-w-0 flex-1">
        {(entry.source || entry.provider || entry.model || entry.event || entry.requestId) && (
          <span className="me-2 inline-flex flex-wrap items-center gap-1 align-top">
            {entry.source && <Chip>{entry.source}</Chip>}
            {entry.provider && <Chip>{entry.provider}</Chip>}
            {entry.model && <Chip>{entry.model}</Chip>}
            {entry.event && <Chip>{entry.event}</Chip>}
            {entry.requestId && <Chip>#{entry.requestId}</Chip>}
          </span>
        )}
        <span className="whitespace-pre-wrap break-all text-ink">
          {long && !expanded ? clampMessage(entry.message) : entry.message}
        </span>
        {long && (
          <button
            type="button"
            onClick={onToggleExpand}
            className="ms-2 align-baseline text-[10px] text-clay hover:underline font-mono"
          >
            {expanded ? collapseLabel : expandLabel}
          </button>
        )}
      </div>
    </div>
  )
}

export default function LogsPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const [levels, setLevels] = useState<LogLevel[]>(() => [...DEFAULT_LOG_LEVELS])
  const [provider, setProvider] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [paused, setPaused] = useState(false)

  const [entries, setEntries] = useState<LogEntry[]>([])
  const [cursor, setCursor] = useState<number | null>(null)
  const [counts, setCounts] = useState<LogCounts>(EMPTY_LOG_COUNTS)
  const [providers, setProviders] = useState<string[]>([])
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set())

  const listRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const followRef = useRef({ following: true, seenId: null as number | null })
  const [, forceRender] = useState(0)

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim())
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [searchInput])

  const resetStream = useCallback(() => {
    setEntries([])
    setCursor(null)
    setExpanded(new Set())
    followRef.current = { following: true, seenId: null }
  }, [])

  const queryKey = ['logs', levelsCsv(levels), provider, search, cursor]
  const query = useQuery<LogsResponse>({
    queryKey,
    queryFn: () => apiFetch(buildLogsQuery({
      levels,
      provider,
      q: search,
      sinceId: cursor,
      limit: LOG_PAGE_LIMIT,
    })),
    refetchInterval: paused ? false : LOG_POLL_MS,
    refetchIntervalInBackground: false,
  })

  useEffect(() => {
    if (!query.data) return
    const incoming = query.data.entries
    setCounts(query.data.counts)
    setProviders(current => collectProviders(current, incoming))
    setEntries(current => mergeEntries(current, incoming, LOG_BUFFER_LIMIT))
    setCursor(current => advanceCursor(current, query.data))
  }, [query.data])

  useEffect(() => {
    if (followRef.current.following && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [entries])

  const handleScroll = () => {
    const element = listRef.current
    if (!element) return
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight
    const isAtBottom = distanceFromBottom <= SCROLL_FOLLOW_SLACK
    const newestId = entries.at(-1)?.id ?? null
    if (isAtBottom) {
      followRef.current = { following: true, seenId: newestId }
    } else if (followRef.current.following) {
      followRef.current = { following: false, seenId: newestId }
    }
    forceRender(tick => tick + 1)
  }

  const jumpToLatest = () => {
    followRef.current = { following: true, seenId: entries.at(-1)?.id ?? null }
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
    forceRender(tick => tick + 1)
  }

  const toggleExpanded = (id: number) => {
    setExpanded(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const clearLogs = useMutation({
    mutationFn: () => apiFetch('/api/logs', { method: 'DELETE' }),
    onSuccess: () => {
      resetStream()
      queryClient.invalidateQueries({ queryKey: ['logs'] })
      toast.success(t('logs.clearedSuccess'))
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('logs.clearFailed'))
    },
  })

  const loading = query.isLoading && entries.length === 0
  const newestId = entries.at(-1)?.id ?? null
  const follow = followRef.current
  const showJump = !follow.following && newestId != null && (follow.seenId == null || newestId > follow.seenId)

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('nav.runtimeStream') || t('logs.title')}
        description={t('logs.description')}
        actions={
          <div className="flex items-center gap-2">
            <ClayButton
              type="button"
              variant="clay-secondary"
              size="sm"
              aria-pressed={paused}
              onClick={() => setPaused(current => !current)}
              className="flex items-center gap-1.5"
            >
              {paused ? <Play className="size-3.5 text-emerald-600" /> : <Pause className="size-3.5 text-amber-600" />}
              {paused ? (t('logs.resume') || 'Resume') : (t('logs.pause') || 'Pause')}
            </ClayButton>
            <ConfirmButton
              variant="outline"
              size="sm"
              disabled={clearLogs.isPending}
              onConfirm={() => clearLogs.mutate()}
            >
              <Trash2 className="size-3.5 text-ink-mute" />
              {t('logs.clear')}
            </ConfirmButton>
          </div>
        }
      />

      {/* Stream Status & Filter Command Ribbon */}
      <RaisedCard elevation="low" className="p-4 border-[2px] border-ink bg-paper-3 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ink/10">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center">
              <span className={`size-2.5 rounded-full ${paused ? 'bg-amber-500' : 'bg-emerald-500 animate-ping absolute'}`} />
              <span className={`size-2.5 rounded-full ${paused ? 'bg-amber-500' : 'bg-emerald-500 relative'}`} />
            </div>
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-ink">
              {paused ? 'STREAM PAUSED' : 'STREAM ACTIVE'}
            </span>
            <span className="text-[11px] font-mono text-ink-mute">
              • {entries.length} events in buffer ({LOG_BUFFER_LIMIT} max)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-ink-mute">Provider:</span>
            <Select
              value={provider}
              onValueChange={(value) => {
                setProvider(value ?? 'all')
                resetStream()
              }}
            >
              <SelectTrigger className="h-8 text-xs font-mono w-40 bg-paper-2">
                <SelectValue>
                  {(value: string) => (!value || value === 'all' ? t('analytics.allProviders') : value)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('analytics.allProviders')}</SelectItem>
                {providers.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Severity Chips & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('logs.levelFilter')}>
            {LOG_LEVELS.map(level => {
              const active = levels.includes(level)
              return (
                <button
                  key={level}
                  type="button"
                  aria-pressed={active}
                  data-level={level}
                  onClick={() => {
                    setLevels(current => toggleLevel(current, level))
                    resetStream()
                  }}
                  className={cn(
                    'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-mono font-medium transition-all',
                    active
                      ? `${LEVEL_CLASS[level]} shadow-sh1 font-bold`
                      : 'border-ink/10 bg-paper-2 text-ink-mute hover:text-ink',
                  )}
                >
                  <span>{level.toUpperCase()}</span>
                  <span className="tabular-nums text-[10px] opacity-75">{counts[level]}</span>
                </button>
              )
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <Terminal className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-mute" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={t('logs.searchPlaceholder')}
              aria-label={t('logs.searchPlaceholder')}
              className="h-8 pl-8 text-xs font-mono bg-paper-2 border-ink/20"
            />
          </div>
        </div>
      </RaisedCard>

      {query.isError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive font-mono">
          {t('logs.loadFailed')}{' '}
          {query.error instanceof Error ? query.error.message : String(query.error ?? '')}
        </div>
      )}

      {/* Terminal Canvas */}
      <InsetPanel depth="deep" className="p-2 sm:p-3 bg-paper-2 relative">
        <div
          ref={listRef}
          onScroll={handleScroll}
          tabIndex={0}
          role="region"
          aria-label={t('nav.runtimeStream')}
          className="max-h-[65vh] min-h-[300px] overflow-y-auto pr-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
        >
          {levels.length === 0 ? (
            <EmptyState
              className="border-0"
              icon={ScrollText}
              title={t('logs.noLevelsTitle')}
              description={t('logs.noLevelsDescription')}
            />
          ) : loading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 10 }).map((_, index) => (
                <Skeleton key={index} className="h-5 rounded bg-ink/5" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            query.isError ? null : (
              <EmptyState
                className="border-0"
                icon={Activity}
                title={t('logs.emptyTitle')}
                description={t('logs.emptyDescription')}
              />
            )
          ) : (
            entries.map(entry => (
              <LogRow
                key={entry.id}
                entry={entry}
                expanded={expanded.has(entry.id)}
                onToggleExpand={() => toggleExpanded(entry.id)}
                expandLabel={t('logs.showMore')}
                collapseLabel={t('logs.showLess')}
              />
            ))
          )}
          <div ref={endRef} />
        </div>

        {showJump && (
          <Button
            type="button"
            size="sm"
            onClick={jumpToLatest}
            className="absolute inset-x-0 bottom-4 mx-auto w-fit shadow-sh2 font-mono text-xs bg-red text-paper-3 dark:text-white hover:bg-red-dark"
          >
            <ArrowDownToLine className="size-3.5 mr-1.5" />
            {t('logs.jumpToLatest')}
          </Button>
        )}
      </InsetPanel>
    </div>
  )
}
