import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n'
import { logout } from '@/lib/api'
import { NAV_GROUPS, type NavItem } from './navigation-config'

interface MobileNavigationSheetProps {
  open: boolean
  onClose: () => void
}

export function MobileNavigationSheet({ open, onClose }: MobileNavigationSheetProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const previousPathname = useRef(location.pathname)
  const sheetRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
      setTimeout(() => sheetRef.current?.focus(), 0)
    } else {
      document.body.style.overflow = ''
      previousActiveElement.current?.focus()
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
      if (e.key === 'Tab') {
        const focusableElements = sheetRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusableElements?.length) return
        const first = focusableElements[0]
        const last = focusableElements[focusableElements.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (previousPathname.current === location.pathname) return
    previousPathname.current = location.pathname
    if (open) onClose()
  }, [location.pathname, open, onClose])

  if (!open) return null

  function isItemActive(to: string) {
    return location.pathname === to || location.pathname.startsWith(to + '/')
  }

  return (
    <div
      ref={sheetRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={t('sidebar.navigation')}
      className="fixed inset-0 z-50 flex flex-col bg-paper"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex items-center justify-between p-4 border-b-[2.5px] border-ink bg-paper-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-tight text-base">Router7</span>
          <span className="font-mono text-xs text-ink-mute">SIVNSH7 · AI Routing</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('nav.closeMenu')}
          className="flex items-center justify-center size-10 rounded-lg border border-ink/20 bg-paper-3 text-ink-soft hover:bg-ink/5 hover:text-ink transition-colors"
        >
          <X className="size-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6" aria-label={t('sidebar.navigation')}>
        {NAV_GROUPS.filter((group) => group.items.length > 0).map((group) => (
          <div key={group.labelKey} className="space-y-2">
            <div className="flex items-center gap-2 px-2 py-1.5 text-ink-mute">
              <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider">
                {group.icon}
                {t(group.labelKey)}
              </span>
            </div>
            <div className="space-y-1 px-1">
              {group.items.map((item: NavItem) => {
                const ItemIcon = item.icon
                const isParentActive = item.children ? location.pathname.startsWith('/models') : false
                return (
                  <div key={item.to} className="space-y-1">
                    <button
                      onClick={() => { navigate(item.to); onClose() }}
                      className={cn(
                        'flex items-center gap-3 w-full rounded-lg px-3 py-3 text-base font-medium transition-colors text-left',
                        isItemActive(item.to) ? 'bg-red text-paper-3' : 'text-ink-soft hover:bg-ink/5 hover:text-ink'
                      )}
                      aria-current={isItemActive(item.to) ? 'page' : undefined}
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center"><ItemIcon className="h-5 w-5" aria-hidden="true" /></span>
                      <span>{t(item.labelKey)}</span>
                    </button>
                    {item.children && isParentActive && (
                      <div className="ms-8 space-y-1 border-s border-ink/15 ps-3">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon
                          const isChildActive = location.pathname === child.to
                          return (
                            <button
                              key={child.to}
                              onClick={() => { navigate(child.to); onClose() }}
                              className={cn(
                                'flex items-center gap-2.5 w-full rounded-md px-2.5 py-2 text-sm font-mono transition-colors text-left',
                                isChildActive ? 'bg-ink/10 text-ink font-semibold' : 'text-ink-mute hover:text-ink hover:bg-ink/5'
                              )}
                              aria-current={isChildActive ? 'page' : undefined}
                            >
                              {ChildIcon && <ChildIcon className="size-4 shrink-0" />}
                              <span className="truncate">{t(child.labelKey)}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <div className="pt-4 border-t border-ink/20 space-y-2">
          <button
            type="button"
            className="flex items-center gap-3 w-full rounded-lg px-3 py-3 text-base font-medium text-ink-soft hover:bg-ink/5 hover:text-ink transition-colors"
            onClick={() => { logout(); onClose() }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            <span>{t('nav.signOut')}</span>
          </button>
        </div>
      </nav>
    </div>
  )
}