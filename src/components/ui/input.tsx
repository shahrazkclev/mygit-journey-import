import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex touch-target md:h-10 w-full rounded-fluid border-2 border-input/80 bg-background px-fluid-md py-fluid-md text-fluid-base ring-offset-background file:border-0 file:bg-transparent file:text-fluid-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary/60 focus-visible:theme-shadow-sm disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-input hover:theme-shadow-xs",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
