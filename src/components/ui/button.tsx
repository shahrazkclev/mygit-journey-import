import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-fluid-sm whitespace-nowrap rounded-fluid text-fluid-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:icon-fluid [&_svg]:shrink-0 hover-lift",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 theme-shadow-md hover:theme-shadow-lg active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 theme-shadow-md hover:theme-shadow-lg active:scale-[0.98]",
        outline:
          "border-2 border-input/80 bg-background hover:bg-accent hover:text-accent-foreground hover:border-accent theme-shadow-sm hover:theme-shadow-md active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 theme-shadow-sm hover:theme-shadow-md active:scale-[0.98]",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:theme-shadow-sm active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline font-medium",
      },
      size: {
        default: "touch-target md:h-10 px-fluid-md py-fluid-md",
        sm: "touch-target md:h-9 rounded-fluid px-fluid-md",
        lg: "touch-target md:h-11 rounded-fluid px-fluid-xl",
        icon: "touch-target md:h-10 md:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
