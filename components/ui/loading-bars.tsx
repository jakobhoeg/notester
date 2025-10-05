"use client"

import { cn } from "@/lib/utils"

interface LoadingBarsProps {
  className?: string
  lines?: number
}

export function LoadingBars({ className, lines = 5 }: LoadingBarsProps) {
  return (
    <div className={cn("flex gap-4 p-5 fade-in-25 md:gap-6", className)}>
      <div className="flex w-full max-w-3xl flex-col gap-4 rounded-lg pt-2">
        {Array.from({ length: lines }).map((_, index) => {
          // Different widths for variety
          const widths = ["w-10/12", "w-full", "w-3/5"]
          const width = widths[index % widths.length]

          // Staggered animation delays
          const delay = index * 200

          return (
            <div
              key={index}
              className={cn("loading-bar h-5 origin-left rounded-sm", width)}
              style={{
                animationDelay: `${delay}ms`,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default LoadingBars
