import type { ApiKeyModel, Platform, ProviderQuotaState, ProviderCategory } from '../../../../shared/types'
import { ExternalLink } from 'lucide-react'
import { useI18n } from '@/i18n'

// Small "Get API key" external link shown next to a provider (#137).
export function GetKeyLink({ url }: { url: string }) {
  const { t } = useI18n()
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {t('keys.getApiKey')}
      <ExternalLink className="size-3" />
    </a>
  )
}

export interface PlatformDefinition {
  value: Platform;
  label: string;
  url: string;
  category: ProviderCategory;
  keyless?: boolean;
}

// Active categorized platforms: OAuth, API, and Gateways
export const ACTIVE_PLATFORMS: PlatformDefinition[] = [
  // ── OAuth Providers ───────────────────────────────────────────────────────
  { value: 'antigravity', label: 'Antigravity (OAuth)', url: 'https://antigravity.google', category: 'oauth' },
  { value: 'copilot', label: 'GitHub Copilot (OAuth)', url: 'https://github.com/features/copilot', category: 'oauth' },
  { value: 'codex', label: 'OpenAI Codex (OAuth)', url: 'https://chatgpt.com', category: 'oauth' },
  { value: 'openreference', label: 'OpenReference (OAuth)', url: 'https://openreference.ai', category: 'oauth' },

  // ── API Direct Providers ──────────────────────────────────────────────────
  { value: 'google', label: 'Google AI Studio', url: 'https://aistudio.google.com/apikey', category: 'api' },
  { value: 'codestral', label: 'Codestral API', url: 'https://codestral.mistral.ai', category: 'api' },
  { value: 'dahl', label: 'Dahl API', url: 'https://dahl.ai', category: 'api' },
  { value: 'nvidia', label: 'NVIDIA NIM', url: 'https://build.nvidia.com/settings/api-keys', category: 'api' },
  { value: 'sail', label: 'Sail Research ($5 monthly with payment method)', url: 'https://app.sailresearch.com', category: 'api' },
  { value: 'github', label: 'GitHub Models', url: 'https://github.com/settings/tokens', category: 'api' },
  { value: 'cohere', label: 'Cohere', url: 'https://dashboard.cohere.com/api-keys', category: 'api' },
  { value: 'cloudflare', label: 'Cloudflare Workers AI', url: 'https://dash.cloudflare.com', category: 'api' },
  { value: 'ollama', label: 'Ollama Cloud', url: 'https://ollama.com/settings/keys', category: 'api' },
  { value: 'ovh', label: 'OVH AI Endpoints (no key needed)', url: 'https://endpoints.ai.cloud.ovh.net', keyless: true, category: 'api' },
  { value: 'agnes', label: 'Agnes AI (free key)', url: 'https://platform.agnes-ai.com', category: 'api' },
  { value: 'sealion', label: 'SEA-LION (free key)', url: 'https://sea-lion.ai', category: 'api' },
  { value: 'inceptionlabs', label: 'Inception Labs (Mercury dLLM)', url: 'https://inceptionlabs.ai', category: 'api' },

  // ── Gateway Aggregators & Routers ─────────────────────────────────────────
  { value: 'agentrouter', label: 'AgentRouter API', url: 'https://agentrouter.ai', category: 'gateway' },
  { value: 'fastrouter', label: 'FastRouter API', url: 'https://fastrouter.io', category: 'gateway' },
  { value: 'llmgateway', label: 'LLM Gateway API', url: 'https://llmgateway.io', category: 'gateway' },
  { value: 'openrouter', label: 'OpenRouter', url: 'https://openrouter.ai/keys', category: 'gateway' },
  { value: 'kilo', label: 'Kilo Gateway (no key needed)', url: 'https://app.kilo.ai', keyless: true, category: 'gateway' },
  { value: 'literouter', label: 'LiteRouter (Multi-model)', url: 'https://literouter.com', category: 'gateway' },
  { value: 'routeway', label: 'Routeway (free key)', url: 'https://routeway.ai', category: 'gateway' },
  { value: 'bazaarlink', label: 'BazaarLink (free key)', url: 'https://bazaarlink.ai', category: 'gateway' },
  { value: 'unorouter', label: 'UnoRouter (free key)', url: 'https://unorouter.com', category: 'gateway' },
  { value: 'requesty', label: 'Requesty (free key)', url: 'https://www.requesty.ai', category: 'gateway' },
  { value: 'navy', label: 'NavyAI (free key)', url: 'https://api.navy', category: 'gateway' },
  { value: 'nara', label: 'NaraRouter (free key)', url: 'https://router.bynara.id', category: 'gateway' },
  { value: 'aion', label: 'Aion Labs (free key)', url: 'https://www.aionlabs.ai', category: 'gateway' },
  { value: 'ainative', label: 'AINative Studio (free key)', url: 'https://ainative.studio', category: 'gateway' },
  { value: 'anyapi', label: 'AnyAPI (free key)', url: 'https://anyapi.ai', category: 'gateway' },
  { value: 'bai', label: 'B.AI (promotional free model)', url: 'https://b.ai', category: 'gateway' },
  { value: 'airforce', label: 'Api.Airforce (daily free requests; 1 per minute)', url: 'https://api.airforce', category: 'gateway' },
  { value: 'logfare', label: 'Logfare (fair-use free models)', url: 'https://logfare.ai', category: 'gateway' },
  { value: 'electronhub', label: 'ElectronHub (shared weekly credits)', url: 'https://app.electronhub.ai', category: 'gateway' },
]

export const REMOVED_PLATFORMS: PlatformDefinition[] = [
  { value: 'aclide', label: 'Aclide', url: 'https://aclide.com', category: 'gateway' },
  { value: 'speka', label: 'Speka ($1 shared monthly credits)', url: 'https://speka.me/dashboard/keys', category: 'gateway' },
  { value: 'llmtr', label: 'LLMTR (daily free-model quotas)', url: 'https://llmtr.com', category: 'gateway' },
  { value: 'moondream', label: 'Moondream ($5 shared monthly credits)', url: 'https://moondream.ai/c/cloud/api-keys', category: 'api' },
  { value: 'groq', label: 'Groq', url: 'https://console.groq.com/keys', category: 'api' },
  { value: 'cerebras', label: 'Cerebras', url: 'https://cloud.cerebras.ai', category: 'api' },
  { value: 'router9', label: 'Router9 (shared monthly credits)', url: 'https://www.router9.com', category: 'gateway' },
  { value: 'experiential', label: 'Experiential Labs (shared monthly credits)', url: 'https://platform.experientiallabs.ai', category: 'gateway' },
  { value: 'septor', label: 'Septor Labs (daily free-model quota)', url: 'https://septorlabs.com/dashboard', category: 'gateway' },
  { value: 'clod', label: 'CLōD (shared daily free requests)', url: 'https://newapp.clod.io', category: 'gateway' },
  { value: 'speechify', label: 'Speechify (monthly free TTS characters)', url: 'https://platform.speechify.ai', category: 'api' },
  { value: 'blaze', label: 'BlazeAPI (daily free tokens; Discord verification)', url: 'https://blazeapi.org/dashboard', category: 'gateway' },
  { value: 'lucidity', label: 'Lucidity Composite (daily free-model requests)', url: 'https://composite.lucidity.sh', category: 'gateway' },
  { value: 'dreamprompting', label: 'DreamPrompting (rolling 24h free tokens and requests)', url: 'https://dreamprompting.com', category: 'gateway' },
  { value: 'waterfall', label: 'Waterfall (community free models)', url: 'https://getwaterfall.org', category: 'gateway' },
  { value: 'radeon', label: 'AMD Radeon Cloud (free shared models)', url: 'https://developer.amd.com.cn/radeon/tokenfactory', category: 'api' },
  { value: 'mistral', label: 'Mistral', url: 'https://console.mistral.ai/api-keys/', category: 'api' },
  { value: 'zhipu', label: 'Zhipu AI (Z.ai)', url: 'https://z.ai/manage-apikey/apikey-list', category: 'api' },
  { value: 'pollinations', label: 'Pollinations', url: 'https://enter.pollinations.ai', category: 'gateway' },
  { value: 'llm7', label: 'LLM7 (anon ok)', url: 'https://llm7.io', category: 'gateway' },
  { value: 'huggingface', label: 'HuggingFace Router', url: 'https://huggingface.co/settings/tokens', category: 'gateway' },
  { value: 'opencode', label: 'OpenCode Zen (paid models only)', url: 'https://opencode.ai/auth', category: 'gateway' },
  { value: 'reka', label: 'Reka (prepaid credits)', url: 'https://platform.reka.ai', category: 'api' },
  { value: 'siliconflow', label: 'SiliconFlow (image + TTS)', url: 'https://siliconflow.com', category: 'gateway' },
  { value: 'orcarouter', label: 'OrcaRouter (free key)', url: 'https://www.orcarouter.ai', category: 'gateway' },
  { value: 'xkiro', label: 'xKiro (free key)', url: 'https://xkiro.com', category: 'gateway' },
  { value: 'modelscope', label: 'ModelScope (free key, needs Aliyun cn binding)', url: 'https://modelscope.cn/my/myaccesstoken', category: 'gateway' },
  { value: 'qianfan', label: 'Baidu Qianfan (free ERNIE, needs cn real-name)', url: 'https://console.bce.baidu.com/qianfan/overview', category: 'api' },
  { value: 'volcengine', label: 'Volcengine Ark (free daily, needs cn real-name)', url: 'https://console.volcengine.com/ark', category: 'api' },
  { value: 'longcat', label: 'LongCat (free daily, email signup ok)', url: 'https://longcat.chat/platform', category: 'api' },
  { value: 'xfyun', label: 'iFlytek Spark (free Lite, needs cn real-name)', url: 'https://console.xfyun.cn', category: 'api' },
  { value: 'aihorde', label: 'AI Horde (no key needed, slow)', url: 'https://aihorde.net/register', keyless: true, category: 'gateway' },
]

export const ALL_PLATFORMS: PlatformDefinition[] = [...ACTIVE_PLATFORMS, ...REMOVED_PLATFORMS]

export const PLATFORMS: PlatformDefinition[] = ACTIVE_PLATFORMS


// 'custom' is configured through its own form (base URL + model), not the
// generic key dropdown — but it still appears in the grouped provider list.
export const CUSTOM_GROUP: PlatformDefinition = {
  value: 'custom',
  label: 'Custom (OpenAI-compatible)',
  url: '',
  category: 'gateway',
}

export const CUSTOM_MODEL_KIND_LABEL: Record<ApiKeyModel['kind'], string> = {
  chat: 'keys.customTypeChat',
  embedding: 'keys.customTypeEmbedding',
  image: 'keys.customTypeImage',
  audio: 'keys.customTypeAudio',
  transcription: 'keys.customTypeTranscription',
}

export function customModelDeleteKey(model: ApiKeyModel): string {
  return `${model.kind}:${model.id}`
}

export function customModelDeletePath(model: ApiKeyModel): string {
  if (model.kind === 'chat') return `/api/models/custom/${model.id}`
  if (model.kind === 'embedding') return `/api/embeddings/custom/${model.id}`
  return `/api/media/custom/${model.id}`
}

export const statusDot: Record<string, string> = {
  healthy: 'bg-emerald-500',
  rate_limited: 'bg-amber-500',
  invalid: 'bg-rose-500',
  error: 'bg-rose-500',
  unknown: 'bg-muted-foreground/40',
}

export const statusLabelKey: Record<string, string> = {
  healthy: 'status.healthy',
  rate_limited: 'status.rateLimited',
  invalid: 'status.invalid',
  error: 'status.error',
  unknown: 'status.unchecked',
}

export interface HealthPlatform {
  platform: string
  totalKeys: number
  healthyKeys: number
  rateLimitedKeys: number
  invalidKeys: number
  errorKeys: number
  unknownKeys: number
}

export interface HealthData {
  platforms: HealthPlatform[]
  keys: { id: number; platform: string; status: string; lastCheckedAt: string | null; lastHealthError: string | null }[]
  quotaStates: ProviderQuotaState[]
}
