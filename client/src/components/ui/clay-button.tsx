import { Button, buttonVariants as baseButtonVariants } from "./button"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const clayButtonVariants = cva(
  "group/clay-btn inline-flex shrink-0 items-center justify-center rounded-[14px] bg-clip-padding text-sm font-medium text-ink whitespace-nowrap transition-all outline-none select-none focus-visible:border-blue focus-visible:ring-3 focus-visible:ring-blue/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-red aria-invalid:ring-3 aria-invalid:ring-red/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        "clay-primary":
          "bg-red text-paper-3 border-[2.5px] border-ink shadow-sh1 hover:shadow-sh2 active:shadow-shpress active:translate-y-[1px] active:translate-x-[1px]",
        "clay-secondary":
          "bg-paper-3 text-ink border-[2.5px] border-ink shadow-sh1 hover:shadow-sh2 active:shadow-shpress active:translate-y-[1px] active:translate-x-[1px]",
        "clay-quiet":
          "bg-transparent text-ink hover:bg-ink/5 hover:text-ink active:bg-ink/10",
        "clay-destructive":
          "bg-red-active text-paper border-[2.5px] border-ink shadow-sh1 hover:shadow-sh2 active:shadow-shpress active:translate-y-[1px] active:translate-x-[1px]",
        "clay-icon":
          "size-8 p-0 rounded-lg border-[2.5px] border-ink bg-paper-3 text-ink-soft hover:bg-ink/5 hover:text-ink hover:shadow-sh1 active:bg-ink/10 active:shadow-shpress",
        default:
          "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        outline:
          "border-[1.5px] border-ink/40 bg-paper-3 text-ink shadow-sm hover:border-ink hover:bg-paper-2 hover:text-ink active:translate-y-px active:shadow-none",
        ghost:
          "text-ink hover:bg-ink/5 hover:text-ink active:bg-ink/10",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 gap-1.5 px-2.5",
        sm: "h-7 gap-1 rounded-lg px-2 text-sm",
        lg: "h-9 gap-1.5 px-3",
        icon: "size-8",
        "icon-sm": "size-7",
        "icon-xs": "size-6 rounded-lg",
        "icon-lg": "size-9",
        xs: "h-6 gap-1 rounded-lg px-2 text-xs",
      },
    },
    defaultVariants: {
      variant: "clay-primary",
      size: "default",
    },
  }
)

export interface ClayButtonProps extends Omit<React.ComponentProps<typeof Button>, 'variant' | 'size'> {
  variant?: "clay-primary" | "clay-secondary" | "clay-quiet" | "clay-destructive" | "clay-icon" | "outline" | "ghost" | "default" | "secondary"
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-xs" | "icon-lg" | "xs"
}

export function ClayButton({
  className,
  variant,
  size,
  ...props
}: ClayButtonProps) {
  return (
    <Button
      className={cn(clayButtonVariants({ variant: variant as any, size: size as any }), className)}
      {...props}
    />
  )
}

export { baseButtonVariants as buttonVariants }
export { clayButtonVariants }
