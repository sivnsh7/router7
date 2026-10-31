import { NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n'
import { logout } from '@/lib/api'
import { NAV_GROUPS } from './navigation-config'
import { BrandLockup } from './brand-lockup'


interface SidebarProps {
  open: boolean
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ open, collapsed, onToggleCollapse }: SidebarProps) {
  const { t } = useI18n()
  const location = useLocation()

  if (!open) return null

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-r-[2.5px] border-ink bg-paper-2 shadow-sh1 transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-[280px]'
      )}
      data-state={collapsed ? 'collapsed' : 'expanded'}
    >
      <div className="flex h-14 items-center justify-between px-3 border-b border-ink/20">
        {collapsed ? (
          <div className="flex items-center justify-center w-full gap-1">
            <BrandLockup collapsed markOnly />
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={t('sidebar.expand')}
              className="flex items-center justify-center size-7 rounded-lg border border-ink/20 bg-paper-3 text-ink-soft hover:bg-ink/5 hover:text-ink transition-colors"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        ) : (
          <>
            <BrandLockup />
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={t('sidebar.collapse')}
              className="flex items-center justify-center size-8 rounded-lg border border-ink/20 bg-paper-3 text-ink-soft hover:bg-ink/5 hover:text-ink transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
          </>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1" aria-label={t('sidebar.navigation')}>
        {NAV_GROUPS.filter((group) => group.items.length > 0).map((group) => (
          <div key={group.labelKey} className="space-y-1">
            {collapsed ? (
              <div className="flex flex-col items-center gap-1">
                {group.items.map((item) => {
                  const ItemIcon = item.icon
                  return (
                    <NavLink key={item.to} to={item.to} aria-label={t(item.labelKey)} title={t(item.labelKey)}
                      className={({ isActive }) => cn('flex items-center justify-center size-10 rounded-lg transition-colors', isActive ? 'bg-red text-paper-3' : 'text-ink-soft hover:bg-ink/5 hover:text-ink')}>
                      <ItemIcon className="size-4 shrink-0" aria-hidden="true" />
                    </NavLink>
                  )
                })}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 px-2 py-1.5 text-ink-mute">
                  <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider">
                    {group.icon}
                    {t(group.labelKey)}
                  </span>
                </div>
                <div className="space-y-0.5 px-1">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon
                    const isParentActive = item.children ? location.pathname.startsWith('/models') : false
                    return (
                      <div key={item.to} className="space-y-0.5">
                        <NavLink
                          to={item.to}
                          className={({ isActive }) => cn(
                            'flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-red text-paper-3'
                              : 'text-ink-soft hover:bg-ink/5 hover:text-ink'
                          )}
                        >
                          <ItemIcon className="size-4 shrink-0" aria-hidden="true" />
                          <span className="truncate">{t(item.labelKey)}</span>
                        </NavLink>
                        {item.children && isParentActive && (
                          <div className="ms-6 space-y-0.5 border-s border-ink/15 ps-2">
                            {item.children.map((child) => {
                              const ChildIcon = child.icon
                              return (
                                <NavLink
                                  key={child.to}
                                  to={child.to}
                                  className={({ isActive }) => cn(
                                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-mono transition-colors',
                                    isActive
                                      ? 'bg-ink/10 text-ink font-semibold'
                                      : 'text-ink-mute hover:text-ink hover:bg-ink/5'
                                  )}
                                >
                                  {ChildIcon && <ChildIcon className="size-3.5 shrink-0" />}
                                  <span className="truncate">{t(child.labelKey)}</span>
                                </NavLink>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        ))}
      </nav>

      <div className="border-t border-ink/20 p-3 space-y-2">
        {collapsed ? (
          <button
            type="button"
            className="flex w-full items-center justify-center rounded-lg p-2 text-ink-soft hover:bg-ink/5 hover:text-ink transition-colors"
            onClick={() => logout()}
            aria-label={t('nav.signOut')}
            title={t('nav.signOut')}
          >
            <LogOut className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-ink transition-colors"
            onClick={() => logout()}
          >
            <LogOut className="size-4" />
            <span>{t('nav.signOut')}</span>
          </button>
        )}
      </div>
    </aside>
  )
}