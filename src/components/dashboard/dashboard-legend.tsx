"use client"

import { cn } from "@/lib/utils"
import type { StatusDistributionItem } from "@/lib/data/dashboard"
import type { DashboardSegmentKey } from "@/lib/dashboard/status-mapping"

type DashboardLegendProps = {
  items: StatusDistributionItem[]
  activeSegment: DashboardSegmentKey | null
  onSelect: (key: DashboardSegmentKey) => void
}

export function DashboardLegend({ items, activeSegment, onSelect }: DashboardLegendProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Bu filtre için veri yok.</p>
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => {
        const active = activeSegment === item.key
        return (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => onSelect(item.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:bg-muted"
              )}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
              <span className="text-muted-foreground">({item.count})</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
