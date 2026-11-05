import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { ClayButton } from '@/components/ui/clay-button'
import { ClayInput } from '@/components/ui/clay-input'
import { Label } from '@/components/ui/label'
import { toast } from '@/lib/toast'
import { ExternalLink, Copy, Check, Loader2, KeyRound, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react'
import type { Platform, OAuthDeviceInitiateResponse, OAuthDevicePollResponse } from '../../../../shared/types'
import { ALL_PLATFORMS } from './shared'
import type { AddedKeyScopeOffer } from './add-key-form'

interface OAuthProviderConnectProps {
  platform: Platform
  label: string
  onLabelChange: (label: string) => void
  onSuccess: (offer?: AddedKeyScopeOffer) => void
}

export function OAuthProviderConnect({
  platform,
  label,
  onLabelChange,
  onSuccess,
}: OAuthProviderConnectProps) {
  const queryClient = useQueryClient()
  const provider = ALL_PLATFORMS.find(p => p.value === platform)
  const providerName = provider?.label || platform

  const [step, setStep] = useState<'idle' | 'initiating' | 'waiting' | 'authorized' | 'error'>('idle')
  const [deviceCode, setDeviceCode] = useState('')
  const [userCode, setUserCode] = useState('')
  const [verificationUri, setVerificationUri] = useState('')
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [pollInterval, setPollInterval] = useState(5)
  const [showManualPaste, setShowManualPaste] = useState(false)
  const [manualToken, setManualToken] = useState('')
  const [manualSubmitting, setManualSubmitting] = useState(false)

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }

  useEffect(() => {
    return () => stopPolling()
  }, [])

  // Auto-start device authorization when component mounts or platform changes
  useEffect(() => {
    startDeviceFlow()
    return () => stopPolling()
  }, [platform])

  async function startDeviceFlow() {
    stopPolling()
    setStep('initiating')
    setErrorMsg('')
    try {
      const res = await apiFetch<OAuthDeviceInitiateResponse>('/api/oauth/device/initiate', {
        method: 'POST',
        body: JSON.stringify({ platform }),
      })
      setDeviceCode(res.deviceCode)
      setUserCode(res.userCode)
      setVerificationUri(res.verificationUri)
      setPollInterval(res.interval || 5)
      setStep('waiting')
    } catch (err) {
      setStep('error')
      setErrorMsg((err as Error).message || 'Failed to initiate OAuth authorization')
    }
  }

  const [checking, setChecking] = useState(false)

  const checkStatus = async () => {
    if (!deviceCode || checking) return
    setChecking(true)
    try {
      const res = await apiFetch<OAuthDevicePollResponse>('/api/oauth/device/poll', {
        method: 'POST',
        body: JSON.stringify({ platform, deviceCode, label: label || undefined }),
      })

      if (res.status === 'authorized') {
        stopPolling()
        setStep('authorized')
        queryClient.invalidateQueries({ queryKey: ['keys'] })
        queryClient.invalidateQueries({ queryKey: ['health'] })
        queryClient.invalidateQueries({ queryKey: ['fallback'] })
        queryClient.invalidateQueries({ queryKey: ['keys-providers'] })
        toast.success(`Successfully connected ${providerName}!`)
        onSuccess({
          keyId: res.keyId ?? 0,
          platformLabel: providerName,
          candidates: [],
        })
      } else if (res.status === 'expired') {
        stopPolling()
        setStep('error')
        setErrorMsg(res.error || 'The authorization code expired. Please try again.')
      } else if (res.status === 'denied') {
        stopPolling()
        setStep('error')
        setErrorMsg(res.error || 'Authorization was declined.')
      } else if (res.status === 'slow_down' && res.interval) {
        setPollInterval(res.interval)
      }
    } catch {
      // Network flutter while polling — continue polling until session expires
    } finally {
      setChecking(false)
    }
  }

  // Active polling loop while in 'waiting' state
  useEffect(() => {
    if (step !== 'waiting' || !deviceCode) {
      stopPolling()
      return
    }

    const intervalMs = Math.max(pollInterval || 5, 1) * 1000
    const timer = setInterval(() => {
      void checkStatus()
    }, intervalMs)
    pollTimerRef.current = timer

    return () => clearInterval(timer)
  }, [step, deviceCode, platform, label, pollInterval, checking])

  async function copyUserCode() {
    if (!userCode) return
    try {
      await navigator.clipboard.writeText(userCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Code copied to clipboard!')
    } catch {
      // ignore
    }
  }

  async function handleManualTokenSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manualToken.trim()) return
    setManualSubmitting(true)
    try {
      await apiFetch('/api/keys', {
        method: 'POST',
        body: JSON.stringify({
          platform,
          key: manualToken.trim(),
          label: label || undefined,
        }),
      })
      queryClient.invalidateQueries({ queryKey: ['keys'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
      queryClient.invalidateQueries({ queryKey: ['fallback'] })
      queryClient.invalidateQueries({ queryKey: ['keys-providers'] })
      toast.success(`Successfully saved ${providerName} OAuth credential!`)
      onSuccess()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setManualSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 py-1">
      {/* Provider Header & OAuth indicator */}
      <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3.5 flex items-start gap-3">
        <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400 shrink-0">
          <ShieldCheck className="size-5" />
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-heading font-semibold text-foreground text-sm">{providerName}</span>
            <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-mono font-medium text-purple-600 dark:text-purple-300">
              OAuth 2.0
            </span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            This provider uses direct OAuth authorization. You do not need to generate or paste raw API keys.
          </p>
        </div>
      </div>

      {/* Device code display and actions */}
      {step === 'initiating' && (
        <div className="flex flex-col items-center justify-center py-6 text-center gap-2.5">
          <Loader2 className="size-6 animate-spin text-purple-500" />
          <p className="text-xs text-muted-foreground">Requesting OAuth authorization session…</p>
        </div>
      )}

      {step === 'waiting' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="text-xs text-muted-foreground font-medium">
              1. Copy your one-time authorization code:
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-border bg-muted/60 px-4 py-2.5 font-mono text-base font-bold tracking-wider text-center select-all text-foreground">
                {userCode}
              </div>
              <ClayButton
                type="button"
                variant="outline"
                size="sm"
                onClick={copyUserCode}
                className="h-10 px-3.5 gap-1.5 shrink-0"
              >
                {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                {copied ? 'Copied' : 'Copy Code'}
              </ClayButton>
            </div>

            <div className="text-xs text-muted-foreground font-medium pt-1">
              2. Open the authorization page and paste the code:
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ClayButton
                type="button"
                size="sm"
                onClick={() => {
                  copyUserCode()
                  window.open(verificationUri, '_blank', 'noopener,noreferrer')
                }}
                className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <ExternalLink className="size-3.5" />
                Open Authorization Page
              </ClayButton>
              <span className="text-[11px] text-muted-foreground">
                ({verificationUri})
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2.5 rounded-lg border border-border/80 bg-muted/30 px-3.5 py-2.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-purple-500 shrink-0" />
              <span>Waiting for authorization in your browser...</span>
            </div>
            <ClayButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void checkStatus()}
              disabled={checking}
              className="h-7 text-xs px-2.5 gap-1 shrink-0"
            >
              <RefreshCw className={`size-3 ${checking ? 'animate-spin' : ''}`} />
              Check status
            </ClayButton>
          </div>
        </div>
      )}

      {step === 'error' && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-destructive text-xs font-medium">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <ClayButton
            type="button"
            size="sm"
            variant="outline"
            onClick={startDeviceFlow}
            className="gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            Restart Authorization
          </ClayButton>
        </div>
      )}

      {/* Optional Custom Label */}
      <div className="space-y-1.5 pt-1">
        <Label className="text-xs">Display label (optional)</Label>
        <ClayInput
          value={label}
          onChange={e => onLabelChange(e.target.value)}
          placeholder={`${providerName} (OAuth)`}
          className="text-xs"
        />
      </div>

      {/* Fallback: Direct Token Entry for CLI tokens */}
      <div className="pt-2 border-t border-border/60">
        <button
          type="button"
          onClick={() => setShowManualPaste(v => !v)}
          className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 flex items-center gap-1"
        >
          <KeyRound className="size-3" />
          {showManualPaste ? 'Hide manual token input' : 'Already have an existing OAuth access token? Enter manually'}
        </button>

        {showManualPaste && (
          <form onSubmit={handleManualTokenSubmit} className="mt-2.5 space-y-2">
            <ClayInput
              type="password"
              value={manualToken}
              onChange={e => setManualToken(e.target.value)}
              placeholder="Paste OAuth token (e.g. gho_... or access_token)"
              className="font-mono text-xs"
            />
            <ClayButton
              type="submit"
              size="sm"
              disabled={!manualToken.trim() || manualSubmitting}
            >
              {manualSubmitting ? 'Saving…' : 'Save OAuth Token'}
            </ClayButton>
          </form>
        )}
      </div>
    </div>
  )
}
