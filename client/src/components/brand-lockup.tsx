import { Link, useInRouterContext } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function Router7Mark({ className = 'size-6 shrink-0' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#7A3430" stroke="#211C15" strokeWidth="4" />
      <path d="M18 18h18a9 9 0 0 1 0 18h-7l17 11H34L19 37v10h-7V18zm7 7v6h11a3 3 0 0 0 0-6H25z" fill="#F9F5EA" />
    </svg>
  )
}

export function BrandLockup({
  collapsed = false,
  className,
  markOnly = false,
}: {
  collapsed?: boolean
  className?: string
  markOnly?: boolean
}) {
  let inRouter = false
  try {
    inRouter = useInRouterContext()
  } catch {
    inRouter = false
  }

  const content = (
    <>
      <Router7Mark className={collapsed ? 'size-8' : 'size-7'} />
      {!collapsed && !markOnly && (
        <div className="flex flex-col min-w-0 text-left">
          <span className="font-semibold tracking-tight text-sm text-ink leading-tight">Router7</span>
          <span className="font-mono text-[10px] text-ink-mute truncate">SIVNSH7 · AI Routing</span>
        </div>
      )}
    </>
  )

  const classes = cn('inline-flex items-center gap-2.5 text-foreground hover:opacity-90 transition-opacity', className)

  if (inRouter) {
    return (
      <Link to="/models/chat" aria-label="Router7 Home" className={classes}>
        {content}
      </Link>
    )
  }

  return (
    <a href="/models/chat" aria-label="Router7 Home" className={classes}>
      {content}
    </a>
  )
}
