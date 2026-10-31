import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, Search, Settings, LogOut, KeyRound, Sun, Moon } from 'lucide-react'
import { useI18n } from '@/i18n'
import { logout } from '@/lib/api'
import { openCommandPalette } from '@/components/command-palette-state'
import { useTheme } from '@/theme-context'
import { ChangeCredentialsModal } from '@/components/auth-gate'
import { SettingsDialog } from '@/components/settings-dialog'

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

export const PAGE_TITLE_MAP: Record<string, string> = {
  '/models/chat': 'nav.modelIndex',
  '/models/fusion': 'nav.ensembleComposer',
  '/models/embeddings': 'nav.vectorModels',
  '/models/image': 'nav.imageGeneration',
  '/models/video': 'nav.videoGeneration',
  '/models/audio': 'nav.voiceAudio',
  '/models/transcription': 'nav.voiceAudio',
  '/playground': 'nav.requestStudio',
  '/keys': 'nav.providerVault',
  '/agents': 'nav.integrations',
  '/analytics': 'nav.routingTelemetry',
  '/logs': 'nav.runtimeStream',
}

function AccountDropdown({
  showSignOut = true,
  settingsLabel,
  signOutLabel,
  changeEmailLabel,
  changePasswordLabel,
  onOpenSettings,
  onChangeEmail,
  onChangePassword,
}: {
  showSignOut?: boolean
  settingsLabel: string
  signOutLabel: string
  changeEmailLabel: string
  changePasswordLabel: string
  onOpenSettings: () => void
  onChangeEmail: () => void
  onChangePassword: () => void
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="account-menu"
        aria-label={t('nav.settings')}
        title={t('nav.settings')}
        className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-mono text-ink-soft hover:bg-paper-3 hover:text-ink transition-colors"
      >
        <Settings className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">{t('nav.settings')}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); triggerRef.current?.focus() }} />
          <div
            id="account-menu"
            role="menu"
            aria-orientation="vertical"
            className="absolute right-0 z-50 mt-1 w-56 rounded-lg border border-ink bg-paper-3 shadow-sh2 overflow-hidden"
          >
            <div className="p-1.5 space-y-0.5">
              <button
                role="menuitem"
                onClick={() => { onOpenSettings(); setOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-left font-mono text-sm hover:bg-ink/10 rounded-md"
              >
                <Settings className="size-4" />
                {settingsLabel}
              </button>
              <hr className="border-[1.5px] border-ink my-1" />
              <button
                role="menuitem"
                onClick={() => { onChangeEmail(); setOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-left font-mono text-sm hover:bg-ink/10 rounded-md"
              >
                <span className="flex size-4 items-center justify-center font-serif text-xs font-bold">@</span>
                {changeEmailLabel}
              </button>
              <button
                role="menuitem"
                onClick={() => { onChangePassword(); setOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-left font-mono text-sm hover:bg-ink/10 rounded-md"
              >
                <KeyRound className="size-4" />
                {changePasswordLabel}
              </button>
              {showSignOut && (
                <button
                  role="menuitem"
                  onClick={() => { logout(); setOpen(false) }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left font-mono text-sm hover:bg-ink/10 rounded-md"
                >
                  <LogOut className="size-4" />
                  {signOutLabel}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function TopBar({
  onMenuClick,
  showMenuButton = false,
  isLoading = false,
  isDesktopApp = false,
  isMacDesktop = false,
}: {
  onMenuClick: () => void
  showMenuButton?: boolean
  isLoading?: boolean
  isDesktopApp?: boolean
  isMacDesktop?: boolean
}) {
  const { t } = useI18n()
  const { setTheme, resolvedDark } = useTheme()
  const location = useLocation()
  const [credentialsMode, setCredentialsMode] = useState<'password' | 'email' | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const activeLabel = useMemo(() => {
    for (const [path, key] of Object.entries(PAGE_TITLE_MAP)) {
      if (location.pathname === path || location.pathname.startsWith(path + '/')) {
        return t(key)
      }
    }
    return ''
  }, [location.pathname, t])

  const toggleTheme = () => {
    setTheme(resolvedDark ? 'light' : 'dark')
  }
  const themeIcon = resolvedDark ? <Moon className="size-4" /> : <Sun className="size-4" />

  return (
    <header
      className={`sticky top-0 z-30 mx-3 mt-3 h-14 rounded-[14px] border-[2.5px] border-ink bg-paper-3 shadow-sh1 flex items-center gap-2 px-3 sm:px-4 ${isMacDesktop ? 'pl-20 sm:pl-20' : ''}`}
      style={isDesktopApp ? ({ WebkitAppRegion: 'drag' } as React.CSSProperties) : undefined}
    >
      {showMenuButton && (
        <button
          type="button"
          onClick={onMenuClick}
          style={isDesktopApp ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties) : undefined}
          aria-label={t('nav.openMenu')}
          className="flex items-center justify-center size-8 rounded-lg border border-ink/20 bg-paper-2 text-ink-soft hover:bg-paper-3 hover:text-ink transition-colors"
        >
          <Menu className="size-4" />
        </button>
      )}

      {activeLabel && (
        <nav aria-label={t('nav.breadcrumb')} className="flex min-w-0 items-center gap-1.5 text-sm text-ink-mute">
          <span className="font-medium text-ink">{activeLabel}</span>
        </nav>
      )}

      <div
        className="ms-auto flex items-center"
        style={isDesktopApp ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties) : undefined}
      >
        <div className="inline-flex items-center rounded-xl border border-ink/20 bg-paper-2/60 p-0.5 shadow-sm">
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label={t('palette.title')}
            className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-mono text-ink-soft hover:bg-paper-3 hover:text-ink transition-colors"
          >
            <Search className="size-4" />
            <kbd className="hidden sm:inline rounded border border-ink/15 bg-paper-3 px-1 py-0.5 text-[10px] text-ink-mute">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
          </button>

          <div className="h-4 w-px bg-ink/15 mx-0.5" />

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={resolvedDark ? t('nav.switchLight') : t('nav.switchDark')}
            title={resolvedDark ? t('nav.switchLight') : t('nav.switchDark')}
            className="flex size-8 items-center justify-center rounded-lg text-ink-soft hover:bg-paper-3 hover:text-ink transition-colors"
          >
            {themeIcon}
          </button>

          <div className="h-4 w-px bg-ink/15 mx-0.5" />

          <AccountDropdown
            showSignOut={!isDesktopApp}
            settingsLabel={t('nav.settings')}
            signOutLabel={t('nav.signOut')}
            changeEmailLabel={t('auth.changeEmail')}
            changePasswordLabel={t('auth.changePassword')}
            onOpenSettings={() => setSettingsOpen(true)}
            onChangeEmail={() => setCredentialsMode('email')}
            onChangePassword={() => setCredentialsMode('password')}
          />
        </div>
      </div>

      {credentialsMode && (
        <ChangeCredentialsModal mode={credentialsMode} onClose={() => setCredentialsMode(null)} />
      )}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      {isLoading && (
        <div className="absolute bottom-0 left-0 h-0.5 w-full overflow-hidden">
          <div className="h-full w-1/3 bg-clay animate-[scroll-progress_1s_linear_infinite]" />
        </div>
      )}
    </header>
  )
}
