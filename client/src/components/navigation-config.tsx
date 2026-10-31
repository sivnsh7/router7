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
  Shield,
  Plug,
  Activity,
  Terminal,
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
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
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
      // Request Studio — execute requests and inspect routing results
      { to: '/playground', labelKey: 'nav.requestStudio', icon: Zap },
    ],
  },

  // ── CONNECTIONS ──
  {
    labelKey: 'sidebar.connections',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    items: [
      // Provider Vault — provider credentials, connection health, quota and model coverage
      { to: '/keys',   labelKey: 'nav.providerVault', icon: Shield },
      // Integrations — coding agents and client toolchain connections
      { to: '/agents', labelKey: 'nav.integrations',  icon: Plug },
    ],
  },

  // ── OPERATIONS ──
  {
    labelKey: 'sidebar.operations',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6"  y1="20" x2="6"  y2="14" />
      </svg>
    ),
    items: [
      // Routing Telemetry — traffic, route quality, provider performance and failure analysis
      { to: '/analytics', labelKey: 'nav.routingTelemetry', icon: Activity },
      // Runtime Stream — live events/logs and request-level inspection
      { to: '/logs',      labelKey: 'nav.runtimeStream',    icon: Terminal },
    ],
  },

  // ── SYSTEM (account + settings in TopBar; no nav items here) ──
  {
    labelKey: 'sidebar.account',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    items: [],
  },
]
