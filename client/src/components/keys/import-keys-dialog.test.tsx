// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/i18n'
import { apiFetch } from '@/lib/api'
import { toast } from '@/lib/toast'
import { ImportKeysDialog } from './import-keys-dialog'

vi.mock('@/lib/api', () => ({ apiFetch: vi.fn() }))
vi.mock('@/lib/toast', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

let root: Root
let container: HTMLDivElement
const onOpenChange = vi.fn()

beforeAll(() => {
  ;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

beforeEach(() => {
  vi.mocked(apiFetch).mockReset()
  vi.mocked(toast.success).mockReset()
  onOpenChange.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function mount(component: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  act(() =>
    root.render(
      <QueryClientProvider client={client}>
        <I18nProvider initialLocale="en">{component}</I18nProvider>
      </QueryClientProvider>,
    ),
  )
}

describe('ImportKeysDialog', () => {
  it('renders dialog elements and allows switching to paste JSON tab', async () => {
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === '/api/keys') return []
      return {}
    })

    mount(<ImportKeysDialog open={true} onOpenChange={onOpenChange} />)

    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await new Promise(r => setTimeout(r, 0))
      })
    }

    expect(document.body.textContent).toContain('Import API Keys')
    expect(document.body.textContent).toContain('File Upload')
    expect(document.body.textContent).toContain('Paste JSON')
    expect(document.body.textContent).toContain('Duplicate Collision Strategy')

    // Click Paste JSON tab
    const pasteTabBtn = Array.from(document.body.querySelectorAll('button')).find(b =>
      b.textContent?.includes('Paste JSON'),
    )
    expect(pasteTabBtn).toBeDefined()

    await act(async () => {
      pasteTabBtn?.click()
    })

    expect(document.body.querySelector('textarea')).not.toBeNull()
  })

  it('parses pasted JSON and displays live preview with collision strategy', async () => {
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === '/api/keys') return []
      if (path === '/api/keys/import-json') {
        return {
          imported: 1,
          updated: 0,
          skipped: [],
          errors: [],
          total: 1,
        }
      }
      return {}
    })

    mount(<ImportKeysDialog open={true} onOpenChange={onOpenChange} />)

    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await new Promise(r => setTimeout(r, 0))
      })
    }

    const pasteTabBtn = Array.from(document.body.querySelectorAll('button')).find(b =>
      b.textContent?.includes('Paste JSON'),
    )
    await act(async () => {
      pasteTabBtn?.click()
    })

    const textarea = document.body.querySelector('textarea')
    expect(textarea).not.toBeNull()

    const sampleJson = JSON.stringify([
      { platform: 'groq', key: 'gsk_SampleSecretKey1234', label: 'My Groq Key' },
    ])

    await act(async () => {
      if (textarea) {
        // Trigger React onChange
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
        setter?.call(textarea, sampleJson)
        textarea.dispatchEvent(new Event('input', { bubbles: true }))
        textarea.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })

    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await new Promise(r => setTimeout(r, 0))
      })
    }

    expect(document.body.textContent).toContain('Detected Keys (1)')
    expect(document.body.textContent).toContain('Groq')

    // Click Overwrite collision strategy
    const overwriteBtn = Array.from(document.body.querySelectorAll('button')).find(b =>
      b.textContent?.includes('Overwrite'),
    )
    await act(async () => {
      overwriteBtn?.click()
    })

    // Submit import
    const submitBtn = Array.from(document.body.querySelectorAll('button')).find(b =>
      b.textContent?.includes('Import Keys'),
    )
    await act(async () => {
      submitBtn?.click()
    })

    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await new Promise(r => setTimeout(r, 0))
      })
    }

    expect(vi.mocked(apiFetch)).toHaveBeenCalledWith(
      '/api/keys/import-json',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          jsonContent: sampleJson,
          collisionStrategy: 'overwrite',
        }),
      }),
    )
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Successfully imported 1 keys'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('safely previews structured OAuth object tokens without error', async () => {
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === '/api/keys') return []
      return {}
    })

    mount(<ImportKeysDialog open={true} onOpenChange={onOpenChange} />)

    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await new Promise(r => setTimeout(r, 0))
      })
    }

    const pasteTabBtn = Array.from(document.body.querySelectorAll('button')).find(b =>
      b.textContent?.includes('Paste JSON'),
    )
    await act(async () => {
      pasteTabBtn?.click()
    })

    const textarea = document.body.querySelector('textarea')
    const sampleOAuthJson = JSON.stringify([
      {
        platform: 'copilot',
        key: { access_token: 'gho_TestAccessToken9876', token_type: 'Bearer' },
        label: 'My Copilot OAuth',
      },
    ])

    await act(async () => {
      if (textarea) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set
        setter?.call(textarea, sampleOAuthJson)
        textarea.dispatchEvent(new Event('input', { bubbles: true }))
        textarea.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })

    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await new Promise(r => setTimeout(r, 0))
      })
    }

    expect(document.body.textContent).toContain('Detected Keys (1)')
    expect(document.body.textContent).toContain('GitHub Copilot')
    expect(document.body.textContent).toContain('gho_...9876')
  })
})
