import { Badge } from "./badge"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const clayBadgeVariants = cva(
  "group/clay-badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border-[1.5px] border-transparent px-2 py-0.5 text-xs font-mono font-medium whitespace-nowrap transition-all focus-visible:border-blue focus-visible:ring-3 focus-visible:ring-blue/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        "status-live": "bg-red-active-tint text-red-active-dark border border-red-active/20",
        "status-wip": "bg-clay-tint text-clay-dark border border-clay/20",
        "status-confirmed": "bg-red-active-tint text-red-active-dark border border-red-active/20",
        "status-probable": "bg-clay-tint text-clay-dark border border-clay/20",
        "status-hypothesis": "bg-red-tint text-red-dark border border-red/20",
        "provider-badge": "bg-paper-3 text-ink-soft border border-ink/20 hover:border-clay/50 hover:text-ink",
        "capability-chip": "bg-paper-2 text-ink-mute border border-ink/15 hover:border-clay/50 hover:text-ink hover:bg-clay-tint",
        "model-badge": "bg-paper-3 text-ink-soft border border-ink/20",
        "live-dot": "bg-green w-2 h-2 rounded-full dark:bg-[var(--green-dark)]",
      },
      size: {
        default: "h-5 px-2 text-[0.68rem]",
        sm: "h-4 px-1.5 text-[0.62rem]",
        lg: "h-6 px-2.5 text-[0.75rem]",
      },
    },
    defaultVariants: {
      variant: "model-badge",
      size: "default",
    },
  }
)

export interface ClayBadgeProps extends Omit<React.ComponentProps<typeof Badge>, 'variant'> {
  variant?: "status-live" | "status-wip" | "status-confirmed" | "status-probable" | "status-hypothesis" | "provider-badge" | "capability-chip" | "model-badge" | "live-dot"
  size?: "sm" | "default" | "lg"
}

export function ClayBadge({
  className,
  variant = "model-badge",
  size = "default",
  children,
  ...props
}: ClayBadgeProps) {
  return (
    <Badge
      className={cn(clayBadgeVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </Badge>
  )
}

export { clayBadgeVariants }