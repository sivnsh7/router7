import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MobileNavigationSheet } from './MobileNavigationSheet'
import { DESKTOP_GLOBALS, type DesktopWindow } from '@/lib/desktop-contract'

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
  const location = useLocation()
  const isPlayground = location.pathname === '/playground'
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 1024
  )
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const closeMobileSheet = useCallback(() => setMobileSheetOpen(false), [])

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

          <main className={isPlayground
            ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
            : 'mx-auto w-full max-w-[1180px] flex-1 overflow-auto px-[clamp(20px,6vw,64px)] py-6 sm:py-8'}>
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
