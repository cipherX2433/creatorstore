import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F1F1F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFFFF] disabled:pointer-events-none disabled:bg-[#ECECE9] disabled:text-[#A8A8A4] disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[#1F1F1F] text-[#FFFFFF] font-bold border-none hover:bg-[#000000] active:bg-[#111111] shadow-xs",
        stacked:
          "stacked-cta-btn bg-[#1F1F1F] text-[#FFFFFF] font-bold border-none hover:bg-[#000000] active:bg-[#111111]",
        accent:
          "bg-[#1F1F1F] text-[#FFFFFF] font-bold border-none hover:bg-[#000000] active:bg-[#111111] disabled:bg-[#ECECE9] disabled:text-[#A8A8A4]",
        destructive:
          "bg-[#FFFFFF] text-[#DC2626] font-bold border border-[#E5E5E3] hover:bg-[#FDECEC] hover:text-[#DC2626] active:bg-[#FEE2E2]",
        destructiveSolid:
          "bg-[#DC2626] text-[#FFFFFF] font-bold border-none hover:bg-[#B91C1C] active:bg-[#991B1B]",
        outline:
          "border border-[#E5E5E3] bg-[#FFFFFF] text-[#1F1F1F] font-semibold hover:bg-[#F5F5F3] hover:border-[#DADAD7] hover:text-[#1F1F1F]",
        secondary:
          "bg-[#FFFFFF] text-[#1F1F1F] font-semibold border border-[#E5E5E3] hover:bg-[#F5F5F3]",
        ghost: "text-[#6F6F6B] hover:bg-[#F5F5F3] hover:text-[#1F1F1F] font-medium",
        link: "text-[#1F1F1F] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-3.5 text-xs font-bold",
        lg: "h-13 px-8 text-base font-bold",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, stackedHover = false, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(
        buttonVariants({ variant: stackedHover ? "stacked" : variant, size }),
        stackedHover && "stacked-cta-btn",
        className,
        'rounded-pill'
      )}
      ref={ref}
      {...props} />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
