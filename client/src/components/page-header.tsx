import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n'

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  actions?: ReactNode
  divider?: boolean
  breadcrumb?: string[]
}

export function PageHeader({ title, description, actions, divider = true, breadcrumb, className, ...props }: PageHeaderProps) {
  const { t } = useI18n()
  return (
    <header className={cn(`mb-6 ${divider ? 'border-b-[1.5px] border-ink/40 pb-5' : ''}`, className)} {...props}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          {breadcrumb && breadcrumb.length > 0 && (
            <nav aria-label={t('nav.breadcrumb')} className="mb-2">
              <ol className="flex items-center gap-1.5 font-mono text-xs text-ink-mute">
                {breadcrumb.map((segment, i) => (
                  <li key={segment + i} className="flex items-center gap-1.5">
                    {i > 0 && <span aria-hidden="true">/</span>}
                    {i === breadcrumb.length - 1 ? (
                      <span aria-current="page">{segment}</span>
                    ) : (
                      <span>{segment}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <h1 className="font-heading text-[clamp(1.75rem,3vw,2.25rem)] font-bold leading-tight tracking-tight text-ink">{title}</h1>
          {description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div>}
      </div>
    </header>
  )
}
