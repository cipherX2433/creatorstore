import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-[#12141c]", className)}
      {...props} />
  );
}

export { Skeleton }
