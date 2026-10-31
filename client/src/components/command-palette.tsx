import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AudioLines,
  Bot,
  Boxes,
  ChartColumn,
  Clapperboard,
  Copy,
  Image as ImageIcon,
  KeyRound,
  Layers,
  MessageSquare,
  Moon,
  Search,
  SquareTerminal,
  Sun,
  X,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api'
import { copyText } from '@/lib/clipboard'
import { toast } from '@/lib/toast'
import { apiBaseUrl } from '@/components/api-usage'
import { COMMAND_PALETTE_EVENT } from '@/components/command-palette-state'
import { useI18n } from '@/i18n'
import type { FallbackEntry } from '@/lib/routing'
import { useTheme } from '@/theme-context'

interface Command {
  id: string
  group: 'pages' | 'actions' | 'models'
  label: string
  keywords: string
  icon: React.ComponentType<{ className?: string }>
  run: () => void
}

// Copy and report what actually happened: on an insecure origin (a plain-HTTP
// LAN install) the copy can fail, and a success toast over an empty clipboard
// is worse than no toast at all (#734).
async function copyAndToast(value: string, success: string, failure: string) {
  if (await copyText(value)) toast.success(success)
  else toast.error(failure)
}

// Cmd+K / Ctrl+K palette: jump to any page or model, toggle theme, copy the
// unified key or base URL. Zero-dep overlay; list is keyboard-driven
// (arrows + Enter) with proper listbox semantics.
export function CommandPalette() {
  const { t } = useI18n()
  const { resolvedDark, setTheme } = useTheme()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const openRef = useRef(false)
  const previousActiveElement = useRef<HTMLElement | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset happens on show (not in an effect watching `open`): the palette
  // always opens blank with the first row active.
  const show = useCallback(() => {
    previousActiveElement.current = document.activeElement as HTMLElement | null
    openRef.current = true
    setQuery('')
    setActive(0)
    setOpen(true)
    // Focus after the overlay paints.
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])
  const hide = useCallback(() => {
    openRef.current = false
    setOpen(false)
    previousActiveElement.current?.focus?.()
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (openRef.current) hide()
        else show()
      } else if (e.key === 'Escape' && openRef.current) {
        hide()
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener(COMMAND_PALETTE_EVENT, show)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(COMMAND_PALETTE_EVENT, show)
    }
  }, [show, hide])

  // Model index loads lazily, only while the palette is open.
  const { data: entries = [] } = useQuery<FallbackEntry[]>({
    queryKey: ['fallback'],
    queryFn: () => apiFetch('/api/fallback'),
    enabled: open,
  })

  const commands = useMemo<Command[]>(() => {
    const go = (to: string) => () => navigate(to)
    const pages: Command[] = [
      { id: 'p-chat', group: 'pages', label: t('models.chatModelsTab'), keywords: 'models chat routing fallback model index text', icon: MessageSquare, run: go('/models/chat') },
      { id: 'p-embeddings', group: 'pages', label: t('models.embeddingsTab'), keywords: 'models embeddings vectors vector models', icon: Layers, run: go('/models/embeddings') },
      { id: 'p-image', group: 'pages', label: t('models.imageTab'), keywords: 'models image generation', icon: ImageIcon, run: go('/models/image') },
      { id: 'p-video', group: 'pages', label: t('models.videoTab'), keywords: 'models video text to video generation mp4', icon: Clapperboard, run: go('/models/video') },
      { id: 'p-audio', group: 'pages', label: t('models.audioTab'), keywords: 'models audio speech tts stt transcription whisper voice', icon: AudioLines, run: go('/models/audio') },
      { id: 'p-fusion', group: 'pages', label: t('models.fusionTab'), keywords: 'models fusion ensemble composer synthesis panel judge', icon: Zap, run: go('/models/fusion') },
      { id: 'p-playground', group: 'pages', label: t('nav.playground'), keywords: 'request studio run execute', icon: SquareTerminal, run: go('/playground') },
      { id: 'p-keys', group: 'pages', label: t('nav.keys'), keywords: 'provider vault connections credentials api tokens keys', icon: KeyRound, run: go('/keys') },
      { id: 'p-agents', group: 'pages', label: t('nav.agents'), keywords: 'integrations toolchain claude codex cline ollama gemini connections', icon: Bot, run: go('/agents') },
      { id: 'p-analytics', group: 'pages', label: t('nav.analytics'), keywords: 'routing telemetry usage stats savings latency analytics', icon: ChartColumn, run: go('/analytics') },
      { id: 'p-logs', group: 'pages', label: t('nav.logs'), keywords: 'runtime stream events live logs console', icon: ChartColumn, run: go('/logs') },
    ]
    const actions: Command[] = [
      {
        id: 'a-theme',
        group: 'actions',
        label: t('palette.toggleTheme'),
        keywords: 'theme dark light mode toggle',
        icon: resolvedDark ? Sun : Moon,
        run: () => {
          setTheme(resolvedDark ? 'light' : 'dark')
        },
      },
      {
        id: 'a-copy-key',
        group: 'actions',
        label: t('setup.copyKey'),
        keywords: 'copy api key unified token',
        icon: Copy,
        run: async () => {
          try {
            const data = await apiFetch<{ apiKey: string }>('/api/settings/api-key')
            if (data?.apiKey) {
              void copyAndToast(data.apiKey, t('setup.copiedKey'), t('common.copyFailed'))
            } else {
              toast.error(t('common.copyFailed'))
            }
          } catch (err) {
            toast.error(err instanceof Error ? err.message : t('common.copyFailed'))
          }
        },
      },
      {
        id: 'a-copy-url',
        group: 'actions',
        label: t('setup.copyUrl'),
        keywords: 'copy base url endpoint',
        icon: Copy,
        run: () => {
          void copyAndToast(apiBaseUrl(), t('setup.copiedUrl'), t('common.copyFailed'))
        },
      },
    ]
    // One entry per logical model (configured providers only).
    const seen = new Set<string>()
    const models: Command[] = []
    for (const e of entries) {
      if (e.keyCount === 0) continue
      const canonical = e.canonicalId ?? e.modelId
      if (seen.has(canonical)) continue
      seen.add(canonical)
      const label = e.groupLabel ?? e.displayName
      models.push({
        id: `m-${canonical}`,
        group: 'models',
        label,
        keywords: `${canonical} ${e.modelId} ${e.platform}`,
        icon: Boxes,
        run: go(`/models/chat/${encodeURIComponent(canonical)}`),
      })
    }
    return [...pages, ...actions, ...models]
  }, [setTheme, entries, navigate, resolvedDark, t])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands.filter(c => c.group !== 'models').concat(commands.filter(c => c.group === 'models').slice(0, 5))
    const matches = commands.filter(c => c.label.toLowerCase().includes(q) || c.keywords.toLowerCase().includes(q))
    // Pages/actions first, then at most 8 model hits so the list stays scannable.
    return matches.filter(c => c.group !== 'models').concat(matches.filter(c => c.group === 'models').slice(0, 8))
  }, [commands, query])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  function runCommand(cmd: Command) {
    hide()
    cmd.run()
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        setActive(a => Math.max(a - 1, 0))
      } else {
        setActive(a => Math.min(a + 1, filtered.length - 1))
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(a => Math.min(a + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(a => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && filtered[active]) {
      e.preventDefault()
      runCommand(filtered[active])
    }
  }

  const groups: { key: Command['group']; labelKey: string }[] = [
    { key: 'pages', labelKey: 'palette.groupPages' },
    { key: 'actions', labelKey: 'palette.groupActions' },
    { key: 'models', labelKey: 'palette.groupModels' },
  ]

  let flatIndex = -1

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-ink/50 px-4 pt-[12vh] sm:pt-[15vh] backdrop-blur-sm animate-in fade-in duration-150"
      onMouseDown={e => {
        if (e.target === e.currentTarget) hide()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('palette.title')}
        className="w-full max-w-xl overflow-hidden rounded-[18px] border-[2.5px] border-ink bg-paper-3 text-ink shadow-sh2 animate-in fade-in zoom-in-95 duration-150 flex flex-col"
        onKeyDown={onListKeyDown}
      >
        <div className="relative flex items-center gap-3 border-b-2 border-ink/15 bg-paper-2/60 px-4 py-3">
          <Search className="size-5 shrink-0 text-ink-mute" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              setActive(0)
            }}
            placeholder={t('palette.placeholder')}
            aria-label={t('palette.placeholder')}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={filtered[active] ? `cmd-${filtered[active].id}` : undefined}
            className="h-8 flex-1 min-w-0 border-0 border-none bg-transparent p-0 text-sm font-sans text-ink placeholder:text-ink-mute outline-none focus:outline-none focus:ring-0 shadow-none appearance-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setActive(0); inputRef.current?.focus() }}
              aria-label={t('models.clearSearch')}
              className="flex size-6 items-center justify-center rounded-md text-ink-mute hover:bg-ink/10 hover:text-ink transition-colors"
            >
              <X className="size-3.5" />
            </button>
          )}
          <kbd className="inline-flex items-center rounded-md border border-ink/20 bg-paper-3 px-2 py-0.5 font-mono text-[10px] font-bold text-ink-mute shadow-sm">
            ESC
          </kbd>
        </div>
        <div ref={listRef} id="command-palette-list" role="listbox" className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm font-mono text-ink-mute">
              {t('palette.empty')}
            </div>
          )}
          {groups.map(g => {
            const items = filtered.filter(c => c.group === g.key)
            if (items.length === 0) return null
            return (
              <div key={g.key} className="mb-2 last:mb-0">
                <div className="px-3 pt-2 pb-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-mute flex items-center justify-between">
                  <span>{t(g.labelKey)}</span>
                  <span className="text-[10px] opacity-60 tabular-nums">{items.length}</span>
                </div>
                <div className="space-y-0.5">
                  {items.map(cmd => {
                    flatIndex += 1
                    const index = flatIndex
                    const isActive = index === active
                    const Icon = cmd.icon
                    return (
                      <button
                        key={cmd.id}
                        id={`cmd-${cmd.id}`}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        data-index={index}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => runCommand(cmd)}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-all outline-none select-none",
                          isActive
                            ? "bg-red text-paper-3 font-semibold shadow-sh1 -translate-y-px"
                            : "text-ink hover:bg-ink/5"
                        )}
                      >
                        <div className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-lg border transition-colors",
                          isActive ? "border-paper-3/30 bg-red-dark text-paper-3" : "border-ink/15 bg-paper-2 text-ink-mute group-hover:text-ink"
                        )}>
                          <Icon className="size-3.5" aria-hidden="true" />
                        </div>
                        <span className="min-w-0 flex-1 truncate font-sans text-sm">{cmd.label}</span>
                        <span className={cn(
                          "font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md",
                          isActive ? "bg-red-dark text-paper-3/90" : "bg-ink/5 text-ink-mute"
                        )}>
                          {g.key === 'pages' ? 'Page' : g.key === 'actions' ? 'Action' : 'Model'}
                        </span>
                        {isActive && (
                          <span className="flex items-center text-xs font-mono opacity-80" aria-hidden="true">
                            ↵
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-between border-t border-ink/15 bg-paper-2/70 px-4 py-2 text-[11px] font-mono text-ink-mute">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-ink/15 bg-paper-3 px-1.5 py-0.5 text-[10px] shadow-sm">↑</kbd>
              <kbd className="rounded border border-ink/15 bg-paper-3 px-1.5 py-0.5 text-[10px] shadow-sm">↓</kbd>
              <span className="ml-0.5">navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-ink/15 bg-paper-3 px-1.5 py-0.5 text-[10px] shadow-sm">↵</kbd>
              <span className="ml-0.5">select</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-ink/15 bg-paper-3 px-1.5 py-0.5 text-[10px] shadow-sm">esc</kbd>
            <span className="ml-0.5">close</span>
          </span>
        </div>
      </div>
    </div>
  )
}
