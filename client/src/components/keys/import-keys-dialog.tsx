import { useState, useMemo, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Upload, FileCode, CheckCircle2, AlertTriangle, Layers } from 'lucide-react'
import { Dialog, DialogClose, DialogPopup, DialogTitle } from '@/components/ui/dialog'
import { ClayButton } from '@/components/ui/clay-button'
import { ClayInput } from '@/components/ui/clay-input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/ui/field-error'
import { apiFetch } from '@/lib/api'
import { toast } from '@/lib/toast'
import type { ApiKey, CollisionStrategy, ImportJsonResponse } from '../../../../shared/types'
import { ALL_PLATFORMS } from './shared'

interface ImportKeysDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportKeysDialog({ open, onOpenChange }: ImportKeysDialogProps) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'file' | 'paste'>('file')
  const [jsonText, setJsonText] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [collisionStrategy, setCollisionStrategy] = useState<CollisionStrategy>('skip')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: existingKeys = [] } = useQuery<ApiKey[]>({
    queryKey: ['keys'],
    queryFn: () => apiFetch('/api/keys'),
  })

  // Parse raw JSON text to provide a live preview of items
  const parsedPreview = useMemo(() => {
    if (!jsonText.trim()) return { items: [], parseError: null }
    try {
      // Basic strip for comments / trailing commas
      const cleaned = jsonText.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
      const parsed = JSON.parse(cleaned)
      let rawList: any[] = []
      if (Array.isArray(parsed)) {
        rawList = parsed
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.keys)) {
          rawList = parsed.keys
        } else {
          rawList = Object.entries(parsed).map(([k, v]) => ({
            platform: k,
            key: typeof v === 'string' ? v : (v as any)?.key || (v as any)?.keyValue || '',
            label: (v as any)?.label || '',
          }))
        }
      }

      const items = rawList.map((item, index) => {
        const platform = item.platform || item.detectedPlatform || ''
        let rawKey = item.key ?? item.keyValue ?? ''
        let keyStr = ''
        if (typeof rawKey === 'object' && rawKey !== null) {
          keyStr = rawKey.access_token ? String(rawKey.access_token) : JSON.stringify(rawKey)
        } else {
          keyStr = String(rawKey)
        }
        if (keyStr.startsWith('{') && keyStr.endsWith('}')) {
          try {
            const parsed = JSON.parse(keyStr)
            if (parsed.access_token) keyStr = String(parsed.access_token)
          } catch {
            // ignore
          }
        }
        const label = item.label || item.keyName || ''
        const provider = ALL_PLATFORMS.find(p => p.value === platform)
        const isDuplicate = existingKeys.some(
          ek => ek.platform === platform && (label ? ek.label.toLowerCase() === label.toLowerCase() : false)
        )
        let previewStr = '(keyless)'
        if (keyStr.trim()) {
          const trimmed = keyStr.trim()
          previewStr = trimmed.length > 8
            ? `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`
            : '****'
        }
        return {
          id: index,
          platform,
          platformLabel: provider?.label || platform || 'Unknown',
          keyPreview: previewStr,
          label: label || provider?.label || platform,
          isDuplicate,
        }
      })
      return { items, parseError: null }
    } catch (e: any) {
      return { items: [], parseError: e.message as string }
    }
  }, [jsonText, existingKeys])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFileName(file.name)
    setError(null)
    const reader = new FileReader()
    reader.onload = event => {
      const content = event.target?.result as string
      setJsonText(content)
    }
    reader.onerror = () => {
      setError('Failed to read file')
    }
    reader.readAsText(file)
  }

  const handleImport = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!jsonText.trim()) {
      setError('Please provide JSON content to import')
      return
    }

    setImporting(true)
    setError(null)

    try {
      const res = await apiFetch<ImportJsonResponse>('/api/keys/import-json', {
        method: 'POST',
        body: JSON.stringify({
          jsonContent: jsonText,
          collisionStrategy,
        }),
      })

      queryClient.invalidateQueries({ queryKey: ['keys'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
      queryClient.invalidateQueries({ queryKey: ['fallback'] })
      queryClient.invalidateQueries({ queryKey: ['keys-providers'] })

      let msg = `Successfully imported ${res.imported} keys`
      if (res.updated > 0) msg += ` (${res.updated} updated)`
      if (res.modelsRegistered && res.modelsRegistered > 0) msg += ` (${res.modelsRegistered} models)`
      if (res.skipped.length > 0) msg += ` (${res.skipped.length} skipped)`

      toast.success(msg)
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup maxWidth="max-w-lg">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-clay/10 p-2 text-clay">
              <Upload className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold font-heading">Import API Keys</DialogTitle>
              <p className="text-xs text-muted-foreground">Restore keys from JSON export or direct paste</p>
            </div>
          </div>
          <DialogClose
            aria-label="Dismiss"
            className="-mr-1 rounded-lg p-1 text-muted-foreground/70 transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <X className="size-4" />
          </DialogClose>
        </div>

        <form onSubmit={handleImport} className="space-y-4">
          {/* Source Tabs */}
          <div className="flex rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setTab('file')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                tab === 'file'
                  ? 'bg-card text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Upload className="size-3.5" />
              File Upload
            </button>
            <button
              type="button"
              onClick={() => setTab('paste')}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all ${
                tab === 'paste'
                  ? 'bg-card text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileCode className="size-3.5" />
              Paste JSON
            </button>
          </div>

          {tab === 'file' ? (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Select JSON or export file</Label>
              <ClayInput
                type="file"
                accept=".json,.jsonc,.txt"
                onChange={handleFileUpload}
                className="cursor-pointer text-xs file:mr-2"
              />
              {selectedFileName && (
                <p className="text-[11px] text-muted-foreground">
                  Loaded file: <span className="font-mono text-foreground">{selectedFileName}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Paste JSON content</Label>
              <Textarea
                rows={5}
                value={jsonText}
                onChange={e => {
                  setJsonText(e.target.value)
                  setError(null)
                }}
                placeholder='[{"platform": "google", "key": "AIza...", "label": "Gemini Key"}]'
                className="font-mono text-xs"
              />
            </div>
          )}

          {/* Collision Strategy */}
          <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Layers className="size-3.5 text-clay" />
              <span>Duplicate Collision Strategy</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCollisionStrategy('skip')}
                className={`rounded-lg border p-2 text-left transition-all ${
                  collisionStrategy === 'skip'
                    ? 'border-clay bg-clay/10 text-foreground font-medium'
                    : 'border-border/60 bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="text-xs font-semibold">Skip</div>
                <div className="text-[10px] leading-tight opacity-80">Preserve existing</div>
              </button>
              <button
                type="button"
                onClick={() => setCollisionStrategy('overwrite')}
                className={`rounded-lg border p-2 text-left transition-all ${
                  collisionStrategy === 'overwrite'
                    ? 'border-clay bg-clay/10 text-foreground font-medium'
                    : 'border-border/60 bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="text-xs font-semibold">Overwrite</div>
                <div className="text-[10px] leading-tight opacity-80">Update duplicates</div>
              </button>
              <button
                type="button"
                onClick={() => setCollisionStrategy('keep_both')}
                className={`rounded-lg border p-2 text-left transition-all ${
                  collisionStrategy === 'keep_both'
                    ? 'border-clay bg-clay/10 text-foreground font-medium'
                    : 'border-border/60 bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="text-xs font-semibold">Keep Both</div>
                <div className="text-[10px] leading-tight opacity-80">Import copy</div>
              </button>
            </div>
          </div>

          {/* Live Preview of Parsed Keys */}
          {parsedPreview.items.length > 0 && (
            <div className="space-y-2 rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  Detected Keys ({parsedPreview.items.length})
                </span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                  <CheckCircle2 className="size-3" /> Valid structure
                </span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {parsedPreview.items.slice(0, 5).map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold text-foreground">{item.platformLabel}</span>
                      <span className="text-[11px] text-muted-foreground truncate">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 text-[11px]">
                      <span className="text-muted-foreground">{item.keyPreview}</span>
                      {item.isDuplicate && (
                        <span className="rounded bg-amber-500/10 px-1 py-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-sans">
                          Duplicate
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {parsedPreview.items.length > 5 && (
                  <p className="text-center text-[10px] text-muted-foreground pt-1">
                    +{parsedPreview.items.length - 5} more keys
                  </p>
                )}
              </div>
            </div>
          )}

          {parsedPreview.parseError && jsonText.trim() && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>Preview notice: JSON syntax not yet complete</span>
            </div>
          )}

          {error && <FieldError error={error} />}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
            <ClayButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={importing}
            >
              Cancel
            </ClayButton>
            <ClayButton
              type="submit"
              size="sm"
              disabled={!jsonText.trim() || importing}
              className="gap-1.5"
            >
              <Upload className="size-3.5" />
              {importing ? 'Importing…' : 'Import Keys'}
            </ClayButton>
          </div>
        </form>
      </DialogPopup>
    </Dialog>
  )
}
