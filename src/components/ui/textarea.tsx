import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[96px] md:min-h-[80px] w-full rounded-fluid border-2 border-input/80 bg-background px-fluid-md py-fluid-md text-fluid-base md:text-fluid-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary/60 focus-visible:theme-shadow-sm disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-input hover:theme-shadow-xs",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
