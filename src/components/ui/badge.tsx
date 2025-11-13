import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-fluid border-2 px-1 py-0.5 text-[10px] md:text-xs font-semibold leading-tight transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 theme-shadow-sm hover:theme-shadow-md",
  {
    variants: {
      variant: {
        default:
          "border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90 hover:border-primary/60",
        secondary:
          "border-secondary/40 bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:border-secondary/60",
        destructive:
          "border-destructive/40 bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:border-destructive/60",
        outline: "text-foreground border-border/60 hover:border-border hover:bg-muted/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
