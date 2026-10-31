import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar, PAGE_TITLE_MAP } from './TopBar'
import { MobileNavigationSheet } from './MobileNavigationSheet'
import { HalftoneWave } from './ui/halftone-wave'
import { NeonMesh } from './ui/neon-mesh'
import { DESKTOP_GLOBALS, type DesktopWindow } from '@/lib/desktop-contract'
import { useI18n } from '@/i18n'

const isDesktopApp = typeof window !== 'undefined'
  && (window as DesktopWindow)[DESKTOP_GLOBALS.DESKTOP] === true

const desktopPlatform = typeof window !== 'undefined'
  ? (window as DesktopWindow)[DESKTOP_GLOBALS.PLATFORM]
  : undefined

const isMacDesktop = isDesktopApp && (
  desktopPlatform ? desktopPlatform === 'darwin' : (typeof navigator !== 'undefined' && /Macintosh|Mac OS X/.test(navigator.userAgent))
)

if (isDesktopApp && typeof document !== 'undefined') {
  document.documentElement.classList.add('desktop')
  if (isMacDesktop) {
    document.documentElement.classList.add('desktop-mac')
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const location = useLocation()
  const isPlayground = location.pathname === '/playground'
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 1024
  )
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const closeMobileSheet = useCallback(() => setMobileSheetOpen(false), [])

  useEffect(() => {
    let title = ''
    for (const [path, key] of Object.entries(PAGE_TITLE_MAP)) {
      if (location.pathname === path || location.pathname.startsWith(path + '/')) {
        title = t(key)
        break
      }
    }
    document.title = title ? `${title} — Router7` : 'Router7 · AI Routing'
  }, [location.pathname, t])

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 1024)
    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  const collapsed = isMobile ? false : !sidebarOpen

  return (
    <div className={`flex flex-col ${isPlayground ? 'h-dvh overflow-hidden' : 'min-h-screen'} ${isMacDesktop ? 'desktop-backdrop' : 'bg-paper'}`}>
      <MobileNavigationSheet open={mobileSheetOpen} onClose={closeMobileSheet} />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          open={!isMobile}
          collapsed={collapsed}
          onToggleCollapse={() => setSidebarOpen(value => !value)}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden min-w-0">
          <TopBar
            onMenuClick={() => setMobileSheetOpen(true)}
            showMenuButton={isMobile}
            isDesktopApp={isDesktopApp}
            isMacDesktop={isMacDesktop}
          />

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
              <NeonMesh transparentBg={true} className="pointer-events-none absolute inset-0 opacity-15" />
              <HalftoneWave interactive={false} speed={0.015} className="pointer-events-none absolute inset-0 opacity-10" />
            </div>

            <main className={isPlayground
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden relative z-10'
              : 'mx-auto w-full max-w-[1360px] flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10'}>
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
