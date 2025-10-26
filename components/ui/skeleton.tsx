import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-secondary/15 dark:bg-secondary/15 animate-pulse rounded-xl", className)}
      {...props}
    />
  )
}

export { Skeleton }
