import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export interface NavItem {
  to: string
  labelKey: string
  icon: LucideIcon
  children?: NavItem[]
}

import {
  MessageSquare,
  GitBranch,
  Brain,
  Image,
  Video,
  Music,
  Zap,
  KeyRound,
  Plug,
  Activity,
  Terminal,
  LayoutGrid,
  Link2,
  Gauge,
  User,
} from 'lucide-react'

// ── Router7 Navigation ──────────────────────────────────────────────────────
// Three top-level groups:
//   WORKSPACES  — where users interact with models and route requests
//   CONNECTIONS — where users manage providers, credentials and integrations
//   OPERATIONS  — where users observe gateway health and events in real time
// ───────────────────────────────────────────────────────────────────────────

export const NAV_GROUPS: { labelKey: string; items: NavItem[]; icon?: ReactNode }[] = [
  // ── WORKSPACES ──
  {
    labelKey: 'sidebar.workspaces',
    icon: <LayoutGrid className="size-4" />,
    items: [
      // Model Index — primary model discovery and routing policy workspace
      {
        to: '/models/chat',
        labelKey: 'nav.modelIndex',
        icon: MessageSquare,
        children: [
          { to: '/models/chat',       labelKey: 'nav.textModels',       icon: MessageSquare },
          { to: '/models/fusion',     labelKey: 'nav.ensembleComposer', icon: GitBranch },
          { to: '/models/embeddings', labelKey: 'nav.vectorModels',     icon: Brain },
          { to: '/models/image',      labelKey: 'nav.imageGeneration',  icon: Image },
          { to: '/models/video',      labelKey: 'nav.videoGeneration',  icon: Video },
          { to: '/models/audio',      labelKey: 'nav.voiceAudio',       icon: Music },
        ],
      },
      // Request Workbench — execute requests and inspect routing results
      { to: '/playground', labelKey: 'nav.requestStudio', icon: Zap },
    ],
  },

  // ── CONNECTIONS ──
  {
    labelKey: 'sidebar.connections',
    icon: <Link2 className="size-4" />,
    items: [
      // Provider Registry — provider credentials, connection health, quota and model coverage
      { to: '/keys',   labelKey: 'nav.providerVault', icon: KeyRound },
      // Client Adapters — coding agents and client toolchain connections
      { to: '/agents', labelKey: 'nav.integrations',  icon: Plug },
    ],
  },

  // ── OPERATIONS ──
  {
    labelKey: 'sidebar.operations',
    icon: <Gauge className="size-4" />,
    items: [
      // Route Observatory — traffic, route quality, provider performance and failure analysis
      { to: '/analytics', labelKey: 'nav.routingTelemetry', icon: Activity },
      // Execution Stream — live events/logs and request-level inspection
      { to: '/logs',      labelKey: 'nav.runtimeStream',    icon: Terminal },
    ],
  },

  // ── SYSTEM (account + settings in TopBar; no nav items here) ──
  {
    labelKey: 'sidebar.account',
    icon: <User className="size-4" />,
    items: [],
  },
]
