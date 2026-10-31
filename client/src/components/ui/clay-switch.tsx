import { Switch } from "./switch"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const claySwitchVariants = cva(
  "peer group/clay-switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-blue focus-visible:ring-3 focus-visible:ring-blue/50 aria-invalid:border-red aria-invalid:ring-3 aria-invalid:ring-red/20 data-disabled:cursor-not-allowed data-disabled:opacity-50",
  {
    variants: {
      size: {
        default: "h-[22px] w-[40px]",
        sm: "h-[18px] w-[32px]",
      },
      variant: {
        clay: "data-checked:bg-clay data-unchecked:bg-ink/15 hover:data-unchecked:bg-ink/20",
        outline: "border border-ink/20 data-checked:bg-clay data-unchecked:bg-paper-3 hover:data-unchecked:bg-paper-2",
        inset: "bg-paper-2 shadow-[inset_2px_2px_0_var(--ink)] data-checked:bg-clay",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "clay",
    },
  }
)

export interface ClaySwitchProps extends Omit<React.ComponentProps<typeof Switch>, 'size'> {
  size?: "sm" | "default"
  variant?: "clay" | "outline" | "inset"
}

export function ClaySwitch({
  className,
  size = "default",
  variant = "clay",
  ...props
}: ClaySwitchProps) {
  return (
    <Switch
      size={size}
      className={cn(claySwitchVariants({ size, variant, className }))}
      {...props}
    />
  )
}

export { claySwitchVariants }