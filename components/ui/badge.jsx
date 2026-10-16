import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 tracking-wide",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#194DF5] text-[#FFFFFF] font-bold shadow-sm",
        secondary:
          "border border-[#D8DFFA] bg-[#F5F5F3] text-[#010619] font-semibold",
        accent:
          "border-transparent bg-[#F9B67D] text-[#010619] font-bold",
        success:
          "border-transparent bg-[#22C55E] text-[#FFFFFF] font-bold",
        destructive:
          "border-transparent bg-[#EF4444] text-[#FFFFFF] font-bold",
        warning:
          "border-transparent bg-[#F59E0B] text-[#FFFFFF] font-bold",
        outline: "border border-[#D8DFFA] text-[#010619] bg-[#FFFFFF]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}) {
  return (<div className={cn(badgeVariants({ variant }), className)} {...props} />);
}

export { Badge, badgeVariants }
