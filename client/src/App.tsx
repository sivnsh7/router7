import { type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import { AuthGate } from '@/components/auth-gate'
import { CommandPalette } from '@/components/command-palette'
import { ErrorBoundary } from '@/components/error-boundary'
import { Toaster } from '@/components/toaster'
import { UpdateReminder } from '@/components/update-reminder'
import { I18nProvider } from '@/i18n'
import { toast } from '@/lib/toast'
import { ThemeProvider } from '@/theme'
import KeysPage from '@/pages/KeysPage'
import PlaygroundPage from '@/pages/PlaygroundPage'
import FallbackPage from '@/pages/FallbackPage'
import ModelDetailPage from '@/pages/ModelDetailPage'
import FusionPage from '@/pages/FusionPage'
import EmbeddingsPage from '@/pages/EmbeddingsPage'
import ImagePage from '@/pages/ImagePage'
import VideoPage from '@/pages/VideoPage'
import AudioPage from '@/pages/AudioPage'
import MediaDetailPage from '@/pages/MediaDetailPage'
import EmbeddingDetailPage from '@/pages/EmbeddingDetailPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import LogsPage from '@/pages/LogsPage'
import NotFoundPage from '@/pages/NotFoundPage'
import AgentsPage from '@/pages/AgentsPage'

// Every failed mutation surfaces as an error toast, so no action fails
// silently. A page that already shows the failure inline can opt out with
// `meta: { silenceToast: true }` on the mutation.
const queryClient = new QueryClient({
  // staleTime dedupes the mount storm (#1047) and keeps page-to-page
  // navigation off the network: the Models page alone mounts ~13 queries,
  // several of them the same endpoint from different components, and
  // staleTime 0 refetched every one of them on every navigation and window
  // focus. Cached data renders immediately either way; this only decides
  // whether a background refetch follows. Thirty seconds is shorter than any
  // poller here (refetchInterval still fires on its own clock), and mutations
  // invalidate explicitly, so nothing user-visible goes stale.
  defaultOptions: { queries: { staleTime: 30_000 } },
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.silenceToast) return
      toast.error(error instanceof Error ? error.message : String(error))
    },
  }),
})

function PageBoundary({ children }: { children: ReactNode }) {
  const location = useLocation()
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <AuthGate>
              <AppShell>
                <PageBoundary>
                    <Routes>
                      {/* ── Root redirect ── */}
                      <Route path="/" element={<Navigate to="/models/chat" replace />} />
                      <Route path="/models" element={<Navigate to="/models/chat" replace />} />

                      {/* ── Model Index workspace ── */}
                      <Route path="/models/chat" element={<FallbackPage />} />
                      <Route path="/models/chat/:id" element={<ModelDetailPage />} />
                      <Route path="/models/fusion" element={<FusionPage />} />
                      <Route path="/models/embeddings" element={<EmbeddingsPage />} />
                      <Route path="/models/embeddings/:id" element={<EmbeddingDetailPage />} />
                      <Route path="/models/image" element={<ImagePage />} />
                      <Route path="/models/image/:id" element={<MediaDetailPage modality="image" />} />
                      <Route path="/models/video" element={<VideoPage />} />
                      <Route path="/models/video/:id" element={<MediaDetailPage modality="video" />} />
                      <Route path="/models/audio" element={<AudioPage />} />
                      <Route path="/models/audio/:id" element={<MediaDetailPage modality="audio" />} />
                      <Route path="/models/transcription/:id" element={<MediaDetailPage modality="transcription" />} />

                      {/* ── Core workspace pages ── */}
                      <Route path="/playground" element={<PlaygroundPage />} />
                      <Route path="/keys" element={<KeysPage />} />
                      <Route path="/agents" element={<AgentsPage />} />
                      <Route path="/analytics" element={<AnalyticsPage />} />
                      <Route path="/logs" element={<LogsPage />} />

                      {/* ── Compatibility redirects (silent, kept for bookmarks/links) ── */}
                      <Route path="/premium" element={<Navigate to="/models/chat" replace />} />
                      <Route path="/fallback" element={<Navigate to="/models/chat" replace />} />
                      <Route path="/test" element={<Navigate to="/playground" replace />} />
                      <Route path="/health" element={<Navigate to="/keys" replace />} />

                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </PageBoundary>
                <Toaster />
                <CommandPalette />
                <UpdateReminder />
              </AppShell>
            </AuthGate>
          </BrowserRouter>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
