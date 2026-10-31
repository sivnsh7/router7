import { Input } from "./input"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const clayInputVariants = cva(
  "w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-ink-mute disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red aria-invalid:ring-3 aria-invalid:ring-red/20",
  {
    variants: {
      variant: {
        inset:
          "border-ink/20 bg-paper-2 shadow-[inset_2px_2px_0_var(--ink)] focus-visible:border-blue focus-visible:ring-3 focus-visible:ring-blue/50 hover:border-blue/50 dark:border-ink/15 dark:bg-paper-2",
        outline:
          "border-ink/20 bg-paper-3 focus-visible:border-blue focus-visible:ring-3 focus-visible:ring-blue/50 hover:border-blue/50",
        flush:
          "border-transparent bg-transparent focus-visible:border-blue focus-visible:ring-3 focus-visible:ring-blue/50 hover:bg-paper-2",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs px-2",
        lg: "h-9 text-base px-3",
      },
    },
    defaultVariants: {
      variant: "inset",
      size: "default",
    },
  }
)

export interface ClayInputProps extends Omit<React.ComponentProps<typeof Input>, 'size'> {
  variant?: "inset" | "outline" | "flush"
  size?: "sm" | "default" | "lg"
}

export function ClayInput({
  className,
  variant = "inset",
  size = "default",
  ...props
}: ClayInputProps) {
  return (
    <Input
      className={cn(clayInputVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { clayInputVariants }