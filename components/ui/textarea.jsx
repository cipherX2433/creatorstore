import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-[#E5E5E3] bg-[#FFFFFF] px-3.5 py-2.5 text-sm text-[#1F1F1F] placeholder:text-[#999995] transition-all hover:border-[#DADAD7] focus:border-[#1F1F1F] focus:outline-none focus:ring-1 focus:ring-[#1F1F1F] disabled:cursor-not-allowed disabled:bg-[#ECECE9] disabled:text-[#A8A8A4] disabled:opacity-60",
        className
      )}
      ref={ref}
      {...props} />
  );
})
Textarea.displayName = "Textarea"

export { Textarea }
