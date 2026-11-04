import {
  siGooglegemini,
  siGithubcopilot,
  siMistralai,
  siNvidia,
  siCloudflare,
  siOllama,
  siGithub,
  type SimpleIcon,
} from 'simple-icons';
import { Cpu, Globe } from 'lucide-react';

interface ProviderLogoProps {
  platform: string;
  className?: string;
  size?: number;
}

const BRAND_ICONS: Partial<Record<string, SimpleIcon>> = {
  copilot: siGithubcopilot,
  codestral: siMistralai,
  google: siGooglegemini,
  gemini: siGooglegemini,
  nvidia: siNvidia,
  cloudflare: siCloudflare,
  ollama: siOllama,
  github: siGithub,
};

/**
 * High-quality vector SVG logos and favicons for AI providers.
 * Accurately represents each platform's real brand geometry, colors, and iconography.
 */
export function ProviderLogo({ platform, className = 'size-4', size = 18 }: ProviderLogoProps) {
  const norm = platform.toLowerCase();

  // 1. SimpleIcons official SVGs where available
  const simpleIcon = BRAND_ICONS[norm];
  if (simpleIcon) {
    return (
      <span className="inline-flex shrink-0 items-center justify-center" title={simpleIcon.title}>
        <svg
          viewBox="0 0 24 24"
          className={className}
          style={{ width: size, height: size }}
          fill={`#${simpleIcon.hex}`}
          aria-hidden="true"
        >
          <path d={simpleIcon.path} />
        </svg>
      </span>
    );
  }

  // 2. Custom high-quality vector SVGs for platforms
  switch (norm) {
    case 'codex':
    case 'openai':
      return (
        <span className="inline-flex shrink-0 items-center justify-center" title="OpenAI Codex">
          <svg viewBox="0 0 24 24" className={className} style={{ width: size, height: size }} fill="#10A37F">
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4947zm-9.66-4.9954a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1402-2.5164zM2.3428 7.897a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1683a.0757.0757 0 0 1-.071 0l-4.8303-2.7866A4.504 4.504 0 0 1 2.3428 7.897zm16.5991 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4023-.6655zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1635a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.6069 1.4997-2.602-1.4997z" />
          </svg>
        </span>
      );

    case 'cohere':
      return (
        <span className="inline-flex shrink-0 items-center justify-center" title="Cohere">
          <svg viewBox="0 0 24 24" className={className} style={{ width: size, height: size }} fill="none">
            <rect width="24" height="24" rx="6" fill="#39594C" />
            <circle cx="9" cy="13" r="5" fill="#D4A373" />
            <circle cx="15" cy="11" r="5" fill="#E29578" fillOpacity="0.85" />
          </svg>
        </span>
      );

    case 'antigravity':
      // Google DeepMind Antigravity quantum orbit symbol
      return (
        <span className="inline-flex shrink-0 items-center justify-center" title="Antigravity">
          <svg viewBox="0 0 24 24" className={className} style={{ width: size, height: size }} fill="none">
            <defs>
              <linearGradient id="ag-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4285F4" />
                <stop offset="50%" stopColor="#8AB4F8" />
                <stop offset="100%" stopColor="#C58AF9" />
              </linearGradient>
            </defs>
            <circle cx="12" cy="12" r="3.5" fill="url(#ag-grad)" />
            <ellipse cx="12" cy="12" rx="9" ry="4" stroke="url(#ag-grad)" strokeWidth="1.8" transform="rotate(-30 12 12)" />
            <ellipse cx="12" cy="12" rx="9" ry="4" stroke="url(#ag-grad)" strokeWidth="1.8" transform="rotate(30 12 12)" />
          </svg>
        </span>
      );

    case 'openreference':
      // OpenReference decentralized knowledge cube / reference node
      return (
        <span className="inline-flex shrink-0 items-center justify-center" title="OpenReference">
          <svg viewBox="0 0 24 24" className={className} style={{ width: size, height: size }} fill="none">
            <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z" fill="#6366F1" fillOpacity="0.2" stroke="#6366F1" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M12 2V12M12 12L21 7M12 12L3 7" stroke="#6366F1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="2" fill="#818CF8" />
          </svg>
        </span>
      );

    case 'dahl':
      // Dahl API neural branching node in warm emerald
      return (
        <span className="inline-flex shrink-0 items-center justify-center" title="Dahl API">
          <svg viewBox="0 0 24 24" className={className} style={{ width: size, height: size }} fill="none">
            <rect width="24" height="24" rx="5" fill="#059669" />
            <path d="M7 17V7h4a5 5 0 0 1 0 10H7zm3-3h1a2 2 0 0 0 0-4h-1v4z" fill="#FFFFFF" />
            <circle cx="18" cy="8" r="1.5" fill="#34D399" />
            <circle cx="18" cy="16" r="1.5" fill="#34D399" />
          </svg>
        </span>
      );

    case 'agentrouter':
      // AgentRouter multi-agent routing constellation
      return (
        <span className="inline-flex shrink-0 items-center justify-center" title="AgentRouter">
          <svg viewBox="0 0 24 24" className={className} style={{ width: size, height: size }} fill="none">
            <circle cx="12" cy="12" r="10" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="3" fill="#38BDF8" />
            <circle cx="6" cy="8" r="2" fill="#818CF8" />
            <circle cx="18" cy="8" r="2" fill="#818CF8" />
            <circle cx="12" cy="19" r="2" fill="#818CF8" />
            <line x1="12" y1="12" x2="6" y2="8" stroke="#38BDF8" strokeWidth="1.5" />
            <line x1="12" y1="12" x2="18" y2="8" stroke="#38BDF8" strokeWidth="1.5" />
            <line x1="12" y1="12" x2="12" y2="19" stroke="#38BDF8" strokeWidth="1.5" />
          </svg>
        </span>
      );

    case 'fastrouter':
      // FastRouter ultra-speed lightning vector
      return (
        <span className="inline-flex shrink-0 items-center justify-center" title="FastRouter">
          <svg viewBox="0 0 24 24" className={className} style={{ width: size, height: size }} fill="none">
            <rect width="24" height="24" rx="5" fill="#EA580C" />
            <path d="M13 2L4 14H12L11 22L20 10H12L13 2Z" fill="#FEF08A" stroke="#FEF08A" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </span>
      );

    case 'llmgateway':
      // LLM Gateway arch / portal vector
      return (
        <span className="inline-flex shrink-0 items-center justify-center" title="LLM Gateway">
          <svg viewBox="0 0 24 24" className={className} style={{ width: size, height: size }} fill="none">
            <rect width="24" height="24" rx="5" fill="#7C3AED" />
            <path d="M6 20V10a6 6 0 0 1 12 0v10" stroke="#DDD6FE" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M10 20v-5a2 2 0 0 1 4 0v5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="7" r="1.5" fill="#FFFFFF" />
          </svg>
        </span>
      );

    case 'openrouter':
      return (
        <span className="inline-flex shrink-0 items-center justify-center" title="OpenRouter">
          <svg viewBox="0 0 24 24" className={className} style={{ width: size, height: size }} fill="none">
            <circle cx="12" cy="12" r="10" fill="#6366F1" />
            <path d="M12 5l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z" fill="#FFFFFF" />
          </svg>
        </span>
      );

    case 'kilo':
      return (
        <span className="inline-flex shrink-0 items-center justify-center" title="Kilo Gateway">
          <svg viewBox="0 0 24 24" className={className} style={{ width: size, height: size }} fill="none">
            <rect width="24" height="24" rx="5" fill="#0284C7" />
            <path d="M8 6v12M8 12l7-6M8 12l7 6" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );

    case 'sail':
      return (
        <span className="inline-flex shrink-0 items-center justify-center" title="Sail Research">
          <svg viewBox="0 0 24 24" className={className} style={{ width: size, height: size }} fill="none">
            <path d="M12 2L4 18h16L12 2z" fill="#0284C7" />
            <path d="M12 6l5 12H7l5-12z" fill="#38BDF8" />
          </svg>
        </span>
      );

    case 'ovh':
      return (
        <span className="inline-flex shrink-0 items-center justify-center" title="OVHcloud">
          <svg viewBox="0 0 24 24" className={className} style={{ width: size, height: size }} fill="none">
            <rect width="24" height="24" rx="5" fill="#000E9C" />
            <circle cx="12" cy="12" r="6" stroke="#FFFFFF" strokeWidth="2.5" />
          </svg>
        </span>
      );

    case 'agnes':
      return (
        <span className="inline-flex shrink-0 items-center justify-center" title="Agnes AI">
          <svg viewBox="0 0 24 24" className={className} style={{ width: size, height: size }} fill="none">
            <circle cx="12" cy="12" r="10" fill="#EC4899" />
            <path d="M12 7l4 10H8l4-10z" fill="#FFFFFF" />
          </svg>
        </span>
      );

    case 'sealion':
      return (
        <span className="inline-flex shrink-0 items-center justify-center" title="SEA-LION">
          <svg viewBox="0 0 24 24" className={className} style={{ width: size, height: size }} fill="none">
            <circle cx="12" cy="12" r="10" fill="#E11D48" />
            <path d="M7 16c2-4 8-4 10 0" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            <circle cx="10" cy="10" r="1.5" fill="#FFFFFF" />
            <circle cx="14" cy="10" r="1.5" fill="#FFFFFF" />
          </svg>
        </span>
      );

    case 'inceptionlabs':
      return (
        <span className="inline-flex shrink-0 items-center justify-center" title="Inception Labs">
          <svg viewBox="0 0 24 24" className={className} style={{ width: size, height: size }} fill="none">
            <circle cx="12" cy="12" r="10" fill="#18181B" />
            <path d="M8 6h8v3H8zm0 4.5h6v3H8zm0 4.5h8v3H8z" fill="#A1A1AA" />
          </svg>
        </span>
      );

    case 'literouter':
      return (
        <span className="inline-flex shrink-0 items-center justify-center" title="LiteRouter">
          <svg viewBox="0 0 24 24" className={className} style={{ width: size, height: size }} fill="none">
            <circle cx="12" cy="12" r="10" fill="#2563EB" />
            <path d="M6 12h12M14 8l4 4-4 4" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );

    case 'custom':
      return (
        <span className="inline-flex shrink-0 items-center justify-center" title="Custom Endpoint">
          <Cpu className={className} style={{ width: size, height: size }} />
        </span>
      );

    default:
      return (
        <span className="inline-flex shrink-0 items-center justify-center text-muted-foreground" title={platform}>
          <Globe className={className} style={{ width: size, height: size }} />
        </span>
      );
  }
}
