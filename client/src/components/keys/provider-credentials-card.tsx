import { useState } from 'react'
import { KeyRound, Zap, Copy, Trash2, Pencil, Network, Check } from 'lucide-react'
import { ClayButton } from '@/components/ui/clay-button'
import { ClayBadge } from '@/components/ui/clay-badge'
import { Switch } from '@/components/ui/switch'
import { ConfirmButton } from '@/components/confirm-button'
import { CooldownTimer } from './cooldown-timer'
import type { ApiKey } from '../../../../shared/types'
import { statusDot } from './shared'
import { ProviderLogo } from '@/components/provider-logo'

interface ProviderCredentialsCardProps {
  platform: string
  keys: ApiKey[]
  statusOf: (k: ApiKey) => string
  healthKeyMap: Map<number, { status: string; lastCheckedAt: string | null; lastHealthError: string | null }>
  onAddKey: () => void
  onEditKey: (key: ApiKey) => void
  onCopyKey: (key: { id: number; maskedKey: string }) => void
  onDeleteKey: (id: number) => void
  onToggleKey: (id: number, enabled: boolean) => void
  onProbeKey: (id: number) => void
  isProbing?: boolean
  probingKeyId?: number | null
  selectedKeyIds: Set<number>
  onToggleSelectKey: (id: number) => void
}

export function ProviderCredentialsCard({
  platform,
  keys,
  statusOf,
  healthKeyMap,
  onAddKey,
  onEditKey,
  onCopyKey,
  onDeleteKey,
  onToggleKey,
  onProbeKey,
  isProbing = false,
  probingKeyId = null,
  selectedKeyIds,
  onToggleSelectKey,
}: ProviderCredentialsCardProps) {
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null)

  const handleQuickCopy = (id: number, masked: string) => {
    navigator.clipboard?.writeText(masked)
    setCopiedKeyId(id)
    setTimeout(() => setCopiedKeyId(null), 1500)
  }

  return (
    <div className="flex flex-col h-full rounded-xl border-[2px] border-ink bg-paper-2 overflow-hidden shadow-sh1">
      {/* Tactical Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-paper-3 border-b-[2px] border-ink">
        <div className="flex items-center gap-2">
          <ProviderLogo platform={platform} className="size-4 shrink-0" />
          <KeyRound className="size-4 text-clay" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
            Credentials Vault
          </span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-paper border border-ink/20 text-ink-mute">
            {keys.length}
          </span>
        </div>
        <ClayButton
          size="xs"
          variant="clay-secondary"
          onClick={onAddKey}
          className="flex items-center gap-1 text-[11px]"
        >
          <span>+ Add Key</span>
        </ClayButton>
      </div>

      {/* Keys List */}
      <div className="flex-1 p-2.5 space-y-2 overflow-y-auto">
        {keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-ink-mute space-y-2">
            <KeyRound className="size-8 stroke-1 text-ink-mute/50" />
            <p className="text-xs font-mono">No keys configured for this provider.</p>
            <ClayButton size="xs" onClick={onAddKey}>
              Add Key Now
            </ClayButton>
          </div>
        ) : (
          keys.map((k) => {
            const status = statusOf(k)
            const health = healthKeyMap.get(k.id)
            const errorMsg = health?.lastHealthError || k.lastHealthError
            const isSelected = selectedKeyIds.has(k.id)
            const isCurrentlyProbing = isProbing && probingKeyId === k.id
            const cooldowns = k.cooldowns ?? []
            const earliestCooldown = cooldowns.length > 0 ? cooldowns[0] : null

            return (
              <div
                key={k.id}
                className={`group p-2.5 rounded-lg border-[1.5px] transition-all ${
                  k.enabled
                    ? 'border-ink/20 bg-paper hover:border-ink/50'
                    : 'border-ink/10 bg-paper/50 opacity-60'
                } ${isSelected ? 'ring-2 ring-clay border-clay' : ''}`}
              >
                {/* Upper line: Key Identifier, Switch, and Status */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelectKey(k.id)}
                      aria-label="Select key"
                      className="size-3.5 rounded border-ink/30 text-clay focus:ring-clay cursor-pointer"
                    />
                    <span className={`size-2 rounded-full shrink-0 ${statusDot[status] ?? statusDot.unknown}`} />
                    <span className="font-mono text-xs font-semibold text-ink truncate" title={k.label || k.maskedKey}>
                      {k.label || k.maskedKey}
                    </span>
                    {k.label && (
                      <span className="font-mono text-[10px] text-ink-mute truncate hidden sm:inline">
                        {k.maskedKey}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Switch
                      size="sm"
                      checked={k.enabled}
                      onCheckedChange={(checked) => onToggleKey(k.id, checked)}
                      aria-label="Toggle key active state"
                    />
                  </div>
                </div>

                {/* Sub-line: Cooldown, Error reason, Latency probe */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  {/* Cooldown Timer */}
                  {earliestCooldown && k.enabled && (
                    <CooldownTimer
                      keyId={k.id}
                      expiresAtMs={earliestCooldown.expiresAtMs}
                      modelId={earliestCooldown.modelId}
                    />
                  )}

                  {/* Status Pill */}
                  <ClayBadge
                    variant={status === 'healthy' ? 'provider-badge' : 'status-wip'}
                    size="sm"
                    className="text-[10px]"
                  >
                    {status.toUpperCase()}
                  </ClayBadge>

                  {/* Proxy Pill if customized */}
                  {k.maskedProxyUrl && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-paper-3 border border-ink/15 text-ink-mute">
                      <Network className="size-2.5" />
                      Proxy
                    </span>
                  )}

                  {/* Latency Ping Probe Button */}
                  <button
                    type="button"
                    onClick={() => onProbeKey(k.id)}
                    disabled={isCurrentlyProbing || !k.enabled}
                    title="Probe key latency & validity"
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-paper hover:bg-clay-tint border border-ink/20 hover:border-clay/50 text-ink transition-colors disabled:opacity-50"
                  >
                    <Zap className={`size-2.5 text-clay ${isCurrentlyProbing ? 'animate-spin' : ''}`} />
                    <span>{isCurrentlyProbing ? 'Pinging...' : 'Ping'}</span>
                  </button>

                  {/* Quick Copy Masked / Full Copy Dialog */}
                  <button
                    type="button"
                    onClick={() => handleQuickCopy(k.id, k.maskedKey)}
                    title="Copy masked fingerprint"
                    className="p-1 rounded hover:bg-paper-3 text-ink-mute hover:text-ink transition-colors"
                  >
                    {copiedKeyId === k.id ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  </button>

                  {/* Reveal / Full Plaintext Copy */}
                  <button
                    type="button"
                    onClick={() => onCopyKey({ id: k.id, maskedKey: k.maskedKey })}
                    title="Export / reveal key with authentication"
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono text-ink-mute hover:text-ink hover:underline"
                  >
                    Reveal
                  </button>

                  {/* Edit Key */}
                  <button
                    type="button"
                    onClick={() => onEditKey(k)}
                    title="Edit key label & budgets"
                    className="p-1 rounded hover:bg-paper-3 text-ink-mute hover:text-ink transition-colors ml-auto"
                  >
                    <Pencil className="size-3" />
                  </button>

                  {/* Delete Key with confirm */}
                  <ConfirmButton
                    variant="ghost"
                    size="xs"
                    className="p-1 text-ink-mute hover:text-destructive transition-colors"
                    confirmLabel="Delete?"
                    onConfirm={() => onDeleteKey(k.id)}
                  >
                    <Trash2 className="size-3" />
                  </ConfirmButton>
                </div>

                {/* Last Health Error Banner */}
                {errorMsg && k.enabled && (
                  <div className="mt-2 p-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-mono text-[10px] leading-tight break-all">
                    {errorMsg}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
