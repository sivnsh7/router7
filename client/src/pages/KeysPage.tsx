import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { ClayButton } from '@/components/ui/clay-button'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { PageHeader } from '@/components/page-header'
import { RaisedCard } from '@/components/ui/clay-card'
import type { ApiKey, Platform } from '../../../shared/types'
import { Plus, Download, ShieldCheck, Activity, KeyRound, RefreshCw, Cpu } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { HealthData } from '@/components/keys/shared'
import { QuotaSignalsSection } from '@/components/keys/quota-signals-section'
import { UnifiedKeySection } from '@/components/keys/unified-key-section'
import { ClientProfilesSection } from '@/components/keys/client-profiles-section'
import { ProxySettingsSection } from '@/components/keys/proxy-settings-section'
import { BackupsSection } from '@/components/keys/backups-section'
import { AnthropicSection } from '@/components/keys/anthropic-section'
import { ProviderList } from '@/components/keys/provider-list'
import { ProviderChecklistSection } from '@/components/keys/provider-checklist-section'
import { AddKeyDialog } from '@/components/keys/add-key-dialog'
import { ExportKeysDialog } from '@/components/keys/export-keys-dialog'
import { AgentCompatibilitySection } from '@/components/keys/agent-compatibility-section'

type KeysTab = 'providers' | 'quotaSignals' | 'apiKey' | 'anthropic' | 'agents'

const KEYS_TABS: { id: KeysTab; labelKey: string }[] = [
  { id: 'providers', labelKey: 'keys.tabProviders' },
  { id: 'quotaSignals', labelKey: 'keys.tabQuotaSignals' },
  { id: 'apiKey', labelKey: 'keys.tabApiKey' },
  { id: 'anthropic', labelKey: 'keys.tabAnthropic' },
  { id: 'agents', labelKey: 'keys.tabAgents' },
]

export default function KeysPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<KeysTab>('providers')
  const [addOpen, setAddOpen] = useState(false)
  const [addPlatform, setAddPlatform] = useState<Platform | ''>('')
  const [exportOpen, setExportOpen] = useState(false)

  const openAddKey = (platform: Platform | '' = '') => {
    setAddPlatform(platform)
    setAddOpen(true)
  }

  const { data: keys = [] } = useQuery<ApiKey[]>({
    queryKey: ['keys'],
    queryFn: () => apiFetch('/api/keys'),
  })

  const { data: healthData } = useQuery<HealthData>({
    queryKey: ['health'],
    queryFn: () => apiFetch('/api/health'),
    refetchInterval: 30000,
  })

  const checkAll = useMutation({
    mutationFn: () => apiFetch('/api/health/check-all', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health'] })
      queryClient.invalidateQueries({ queryKey: ['keys'] })
    },
  })

  // Unique active platforms with credentials
  const uniquePlatforms = new Set(keys.map(k => k.platform))
  const healthyKeysCount = keys.filter(k => k.status === 'healthy').length

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.providerVault') || t('keys.pageTitle')}
        description={t('keys.pageDescription')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {(tab === 'providers' || tab === 'quotaSignals') && keys.length > 0 && (
              <ClayButton
                variant="clay-secondary"
                size="sm"
                onClick={() => checkAll.mutate()}
                disabled={checkAll.isPending}
                className="flex items-center gap-1.5"
              >
                <RefreshCw className={`size-3.5 ${checkAll.isPending ? 'animate-spin' : ''}`} />
                {checkAll.isPending ? t('keys.checking') : (t('keys.checkAll') || 'Verify Connections')}
              </ClayButton>
            )}
            {keys.length > 0 && (
              <ClayButton
                variant="clay-secondary"
                size="sm"
                onClick={() => setExportOpen(true)}
                className="flex items-center gap-1.5"
              >
                <Download className="size-3.5" />
                {t('keys.export')}
              </ClayButton>
            )}
            {tab === 'providers' && (
              <ClayButton
                size="sm"
                onClick={() => openAddKey()}
                className="flex items-center gap-1.5"
              >
                <Plus className="size-3.5" />
                {t('keys.addKey')}
              </ClayButton>
            )}
            <SegmentedControl
              value={tab}
              onValueChange={v => setTab(v as KeysTab)}
              options={KEYS_TABS.map(tb => ({ value: tb.id, label: t(tb.labelKey) }))}
              ariaLabel={t('keys.pageTitle')}
            />
          </div>
        }
      />

      {/* Vault Summary KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <RaisedCard elevation="low" className="p-3 border-[2px] border-ink bg-paper-3 space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-ink-mute">
            <span>Configured Keys</span>
            <KeyRound className="size-3.5 text-clay" />
          </div>
          <div className="text-xl font-bold font-mono text-ink">{keys.length}</div>
        </RaisedCard>

        <RaisedCard elevation="low" className="p-3 border-[2px] border-ink bg-paper-3 space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-ink-mute">
            <span>Active Providers</span>
            <Cpu className="size-3.5 text-clay" />
          </div>
          <div className="text-xl font-bold font-mono text-ink">{uniquePlatforms.size}</div>
        </RaisedCard>

        <RaisedCard elevation="low" className="p-3 border-[2px] border-ink bg-paper-3 space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-ink-mute">
            <span>Verified Healthy</span>
            <ShieldCheck className="size-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-ink">
            {healthyKeysCount}
            <span className="text-xs font-normal text-ink-mute ml-1">/ {keys.length}</span>
          </div>
        </RaisedCard>

        <RaisedCard elevation="low" className="p-3 border-[2px] border-ink bg-paper-3 space-y-1">
          <div className="flex items-center justify-between text-xs font-mono text-ink-mute">
            <span>Quota Signals</span>
            <Activity className="size-3.5 text-clay" />
          </div>
          <div className="text-xl font-bold font-mono text-ink">
            {healthData?.quotaStates?.length ?? 0}
            <span className="text-xs font-normal text-ink-mute ml-1">monitored</span>
          </div>
        </RaisedCard>
      </div>

      <div className="space-y-8">
        {tab === 'apiKey' && (
          <div className="space-y-6">
            <UnifiedKeySection />
            <ClientProfilesSection />
            <ProxySettingsSection />
            <BackupsSection />
          </div>
        )}

        {tab === 'anthropic' && <AnthropicSection />}
        {tab === 'agents' && <AgentCompatibilitySection />}

        {tab === 'quotaSignals' && (
          <QuotaSignalsSection states={healthData?.quotaStates ?? []} />
        )}

        {tab === 'providers' && (
          <div className="space-y-6">
            <ProviderChecklistSection onAddKey={platform => openAddKey(platform as Platform)} />
            <ProviderList onAddKey={() => openAddKey()} />
          </div>
        )}
      </div>

      <AddKeyDialog open={addOpen} onOpenChange={setAddOpen} initialPlatform={addPlatform || undefined} />
      {exportOpen && <ExportKeysDialog open={exportOpen} onOpenChange={setExportOpen} />}
    </div>
  )
}
