import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = path.dirname(fileURLToPath(import.meta.url))
const app = readFileSync(path.join(here, 'App.tsx'), 'utf8')
const shell = readFileSync(path.join(here, 'components/AppShell.tsx'), 'utf8')
const playground = readFileSync(path.join(here, 'pages/PlaygroundPage.tsx'), 'utf8')

describe('app shell heights', () => {
  it('pins full-bleed routes to the viewport while padded routes can grow', () => {
    expect(shell).toContain("isPlayground ? 'h-dvh overflow-hidden' : 'min-h-screen'")
  })

  it('keeps a definite, shrinkable height through the flex chain to Playground', () => {
    expect(shell).toContain('className="flex min-h-0 flex-1 overflow-hidden"')
    expect(shell).toContain('className="flex min-h-0 flex-1 flex-col overflow-hidden min-w-0"')
    expect(playground).toContain('flex min-h-0 flex-1 overflow-hidden')
  })

  it('keeps the existing /playground route inside the full-bleed shell', () => {
    expect(app).toContain('path="/playground"')
    expect(shell).toContain("location.pathname === '/playground'")
  })
})
