import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const raisedCardVariants = cva(
  "bg-paper-3 border-[2.5px] border-ink rounded-[14px] transition-all duration-200",
  {
    variants: {
      elevation: {
        low: "shadow-sh1 hover:shadow-sh2 hover:-translate-y-0.5",
        medium: "shadow-sh2 hover:shadow-shhero hover:-translate-y-1",
        high: "shadow-shhero hover:shadow-shhero hover:-translate-y-1",
      },
      fold: {
        none: "",
        folded: "relative",
      },
      interactive: {
        true: "cursor-pointer",
        false: "",
      },
    },
    compoundVariants: [
      {
        fold: "folded",
        className: "after:absolute after:top-[-1px] after:right-[-1px] after:w-[26px] after:h-[26px] after:bg-gradient-to-br after:from-transparent after:via-transparent after:to-paper after:border-l after:border-b after:border-ink after:rounded-tr-xl after:rounded-bl-[8px]",
      },
    ],
    defaultVariants: {
      elevation: "medium",
      fold: "none",
      interactive: false,
    },
  }
)

const insetPanelVariants = cva(
  "bg-paper-2 border border-ink/15 rounded-[14px] transition-all duration-200",
  {
    variants: {
      depth: {
        shallow: "shadow-[inset_2px_2px_0_var(--ink)]",
        medium: "shadow-[inset_4px_4px_0_var(--ink)]",
        deep: "shadow-[inset_6px_6px_0_var(--ink)]",
      },
    },
    defaultVariants: {
      depth: "medium",
    },
  }
)

interface RaisedCardProps extends React.ComponentProps<"div"> {
  elevation?: "low" | "medium" | "high"
  fold?: boolean
  interactive?: boolean
}

interface InsetPanelProps extends React.ComponentProps<"div"> {
  depth?: "shallow" | "medium" | "deep"
}

export function RaisedCard({
  className,
  elevation = "medium",
  fold = false,
  interactive = false,
  children,
  ...props
}: RaisedCardProps) {
  return (
    <div
      className={cn(raisedCardVariants({ elevation, fold: fold ? "folded" : "none", interactive }), className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function InsetPanel({
  className,
  depth = "medium",
  children,
  ...props
}: InsetPanelProps) {
  return (
    <div
      className={cn(insetPanelVariants({ depth }), className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function FoldedCard({
  className,
  elevation = "medium",
  interactive = false,
  children,
  ...props
}: RaisedCardProps) {
  return (
    <RaisedCard
      className={cn(raisedCardVariants({ elevation, fold: "folded", interactive }), className)}
      {...props}
    >
      {children}
    </RaisedCard>
  )
}

export { raisedCardVariants, insetPanelVariants }