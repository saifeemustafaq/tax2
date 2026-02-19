"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const STEPS = [
  { label: "Uploaded Document", path: "/documents/upload" },
  { label: "Duration", path: "/duration" },
] as const

function getCompletedSteps(pathname: string): number {
  const currentIndex = STEPS.findIndex((s) => pathname === s.path)
  if (currentIndex === -1) return 0
  return currentIndex
}

export function StepProgressBar() {
  const pathname = usePathname()
  const completed = getCompletedSteps(pathname)
  const total = STEPS.length
  const fillPercent = total > 0 ? (completed / total) * 100 : 0

  return (
    <div
      className="w-full shrink-0 border-b border-border bg-muted/30"
      role="progressbar"
      aria-valuenow={completed}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`Step ${completed + 1} of ${total}: ${STEPS[completed]?.label ?? "Getting started"}`}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-green-600 transition-[width] duration-300 ease-out"
            style={{ width: `${fillPercent}%` }}
          />
        </div>
        <div className="flex justify-between gap-2 text-sm text-muted-foreground">
          {STEPS.map((step, i) => (
            <span
              key={step.path}
              className={cn(
                "truncate",
                i <= completed - 1 && "font-medium text-green-700 dark:text-green-400",
                i === completed && "font-medium text-foreground"
              )}
            >
              {step.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
