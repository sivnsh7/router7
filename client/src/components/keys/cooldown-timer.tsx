import { useState, useEffect } from 'react'
import { RotateCcw, Timer } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { toast } from '@/lib/toast'

interface CooldownTimerProps {
  keyId?: number
  platform?: string
  expiresAtMs: number
  modelId?: string
  onReset?: () => void
}

export function CooldownTimer({ keyId, platform, expiresAtMs, modelId, onReset }: CooldownTimerProps) {
  const queryClient = useQueryClient()
  const [remainingSecs, setRemainingSecs] = useState<number>(() =>
    Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000))
  )

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000))
      setRemainingSecs(diff)
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [expiresAtMs])

  const resetMutation = useMutation({
    mutationFn: () => {
      if (keyId != null) {
        return apiFetch(`/api/keys/${keyId}/cooldowns`, { method: 'DELETE' })
      }
      if (platform) {
        return apiFetch(`/api/keys/platform/${platform}/cooldowns`, { method: 'DELETE' })
      }
      return Promise.reject(new Error('No target for cooldown reset'))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keys'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
      queryClient.invalidateQueries({ queryKey: ['fallback'] })
      toast.success(modelId ? `Cooldown reset for ${modelId}` : 'Cooldown cleared')
      onReset?.()
    },
    onError: (err) => {
      toast.error(`Failed to reset cooldown: ${err instanceof Error ? err.message : String(err)}`)
    },
  })

  if (remainingSecs <= 0) return null

  const formatTime = (secs: number) => {
    if (secs < 60) return `${secs}s`
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins}m ${rem}s`
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-mono text-[11px]">
      <Timer className="size-3 shrink-0 animate-pulse" />
      <span>{formatTime(remainingSecs)}</span>
      {modelId && <span className="opacity-70 text-[10px] hidden sm:inline">({modelId})</span>}
      {(keyId != null || platform) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            resetMutation.mutate()
          }}
          disabled={resetMutation.isPending}
          title="Clear cooldown immediately"
          className="ml-1 p-0.5 rounded hover:bg-amber-500/20 active:scale-95 transition-all text-amber-700 dark:text-amber-300"
          aria-label="Reset cooldown"
        >
          <RotateCcw className={`size-2.5 ${resetMutation.isPending ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  )
}
