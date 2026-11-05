// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/i18n'
import { apiFetch } from '@/lib/api'
import { OAuthProviderConnect } from './oauth-provider-connect'

vi.mock('@/lib/api', () => ({ apiFetch: vi.fn() }))
vi.mock('@/lib/toast', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

let root: Root
let container: HTMLDivElement
const onSuccess = vi.fn()
const onLabelChange = vi.fn()

beforeAll(() => {
  ;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

beforeEach(() => {
  vi.mocked(apiFetch).mockReset()
  onSuccess.mockReset()
  onLabelChange.mockReset()
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

describe('OAuthProviderConnect', () => {
  it('initiates device flow on mount and renders user code and verification link', async () => {
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === '/api/oauth/device/initiate') {
        return {
          platform: 'copilot',
          deviceCode: 'dc_12345',
          userCode: 'ABCD-EFGH',
          verificationUri: 'https://github.com/login/device',
          expiresIn: 900,
          interval: 5,
        }
      }
      return {}
    })

    mount(
      <OAuthProviderConnect
        platform="copilot"
        label="My Copilot"
        onLabelChange={onLabelChange}
        onSuccess={onSuccess}
      />,
    )

    // Flush async initiation
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await new Promise(r => setTimeout(r, 0))
      })
    }

    expect(container.textContent).toContain('OAuth 2.0')
    expect(container.textContent).toContain('ABCD-EFGH')
    expect(container.textContent).toContain('Open Authorization Page')
    expect(vi.mocked(apiFetch)).toHaveBeenCalledWith('/api/oauth/device/initiate', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ platform: 'copilot' }),
    }))
  })

  it('completes flow and triggers onSuccess when Check status returns authorized', async () => {
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === '/api/oauth/device/initiate') {
        return {
          platform: 'antigravity',
          deviceCode: 'dc_ag_123',
          userCode: 'WXYZ-1234',
          verificationUri: 'https://antigravity.google/oauth/device',
          expiresIn: 900,
          interval: 60,
        }
      }
      if (path === '/api/oauth/device/poll') {
        return {
          status: 'authorized',
          keyId: 42,
          platform: 'antigravity',
          maskedToken: 'ag_o...1234',
        }
      }
      return {}
    })

    mount(
      <OAuthProviderConnect
        platform="antigravity"
        label="AG Agent"
        onLabelChange={onLabelChange}
        onSuccess={onSuccess}
      />,
    )

    // Flush async initiate
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await new Promise(r => setTimeout(r, 0))
      })
    }

    const checkBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent?.includes('Check status'),
    )
    expect(checkBtn).toBeDefined()

    await act(async () => {
      checkBtn?.click()
    })

    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await new Promise(r => setTimeout(r, 0))
      })
    }

    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({
      keyId: 42,
    }))
  })

  it('displays error message when authorization is declined', async () => {
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === '/api/oauth/device/initiate') {
        return {
          platform: 'antigravity',
          deviceCode: 'dc_ag_123',
          userCode: 'WXYZ-1234',
          verificationUri: 'https://antigravity.google/oauth/device',
          expiresIn: 900,
          interval: 60,
        }
      }
      if (path === '/api/oauth/device/poll') {
        return {
          status: 'denied',
          error: 'User denied authorization',
        }
      }
      return {}
    })

    mount(
      <OAuthProviderConnect
        platform="antigravity"
        label="AG Agent"
        onLabelChange={onLabelChange}
        onSuccess={onSuccess}
      />,
    )

    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await new Promise(r => setTimeout(r, 0))
      })
    }

    const checkBtn = Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent?.includes('Check status'),
    )

    await act(async () => {
      checkBtn?.click()
    })

    for (let i = 0; i < 4; i++) {
      await act(async () => {
        await new Promise(r => setTimeout(r, 0))
      })
    }

    expect(container.textContent).toContain('User denied authorization')
  })
})
