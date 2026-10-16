"use client";
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme}
      position="top-center"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast font-sans rounded-full px-5 py-3 border border-[#2E2E2E] bg-[#1A1A1A] shadow-xl text-sm font-semibold flex items-center gap-3 text-[#F5F5F5]",
          description: "text-xs text-[#96969D]",
          actionButton:
            "rounded-full px-3 py-1 font-bold text-xs bg-[#242424] text-[#F5F5F5]",
          cancelButton:
            "rounded-full px-3 py-1 font-medium text-xs bg-[#242424] text-current",
          success: "!bg-[#22C55E] !text-[#FFFFFF] !border-transparent !font-bold",
          error: "!bg-[#EF4444] !text-[#FFFFFF] !border-transparent !font-bold",
          info: "!bg-primary !text-primary-foreground !border-transparent !font-bold",
          warning: "!bg-[#CBE957] !text-[#000000] !border-transparent !font-bold",
        },
      }}
      {...props} />
  );
}

export { Toaster }
