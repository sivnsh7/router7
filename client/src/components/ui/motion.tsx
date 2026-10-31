import { useEffect, useState, useCallback } from 'react'

interface UseRevealOptions {
  threshold?: number
  rootMargin?: string
  staggerMs?: number
  enabled?: boolean
  /**
   * A ref to the element whose .reveal descendants should be observed.
   * This is the same element the caller attaches its own ref to — the hook
   * queries children of this node, not of an internal container. If absent
   * or not yet mounted the hook is a no-op and content stays visible.
   */
  rootRef?: React.RefObject<HTMLElement | null>
}

export function useReveal({
  threshold = 0.1,
  rootMargin = '0px 0px -50px 0px',
  staggerMs = 55,
  enabled = true,
  rootRef,
}: UseRevealOptions = {}) {
  const [revealed, setRevealed] = useState(false)

  const checkReducedMotion = useCallback(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    if (!enabled || checkReducedMotion()) {
      setRevealed(true)
      return
    }

    // Progressive enhancement: if IntersectionObserver is unavailable (very
    // old browsers, certain test environments without a mock) skip the reveal
    // animation rather than leaving content permanently hidden. The .js-reveal
    // class is only added in main.tsx when this check also passes.
    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true)
      return
    }

    // rootRef must be attached to a mounted DOM node before the observer can
    // query descendants. If not yet mounted the effect will re-run when the
    // ref value changes (rootRef is in the dependency array).
    const root = rootRef?.current
    if (!root) return

    const revealTimers: number[] = []
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, idx) => {
          if (entry.isIntersecting) {
            const timer = window.setTimeout(() => {
              entry.target.classList.add('in')
            }, idx * staggerMs)
            revealTimers.push(timer)
            observer.unobserve(entry.target)
          }
        })
      },
      // root: null means the viewport is the scroll container. Pass
      // rootRef.current as root only when reveal should trigger relative to an
      // inner scrolling element (not the page scroll root).
      { threshold, rootMargin, root: null }
    )

    // Query .reveal descendants from the caller's actual container element,
    // not from an internal unattached ref.
    const elements = root.querySelectorAll<Element>('.reveal')
    if (elements.length > 0) {
      elements.forEach((el) => observer.observe(el))
    } else if (root.classList.contains('reveal')) {
      // rootRef itself is the reveal target (single-element usage).
      observer.observe(root)
    } else {
      // No reveal targets found in this subtree; mark as revealed immediately
      // so dependent UI (e.g. an opacity gate) does not wait forever.
      setRevealed(true)
    }

    return () => {
      observer.disconnect()
      revealTimers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [threshold, rootMargin, staggerMs, enabled, checkReducedMotion, rootRef])

  return { revealed }
}

interface RevealProps extends React.ComponentProps<'div'> {
  staggerIndex?: number
  staggerMs?: number
}

export function Reveal({
  className,
  staggerIndex = 0,
  staggerMs = 55,
  children,
  ...props
}: RevealProps) {
  const style =
    staggerIndex > 0
      ? ({ '--animation-delay': `${staggerIndex * staggerMs}ms` } as React.CSSProperties)
      : undefined

  return (
    <div
      className={`reveal ${className || ''}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  )
}
