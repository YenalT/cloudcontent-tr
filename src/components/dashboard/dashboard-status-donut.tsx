"use client"

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

import type { StatusDistributionItem } from "@/lib/data/dashboard"
import type { DashboardSegmentKey } from "@/lib/dashboard/status-mapping"

type DashboardStatusDonutProps = {
  data: StatusDistributionItem[]
  activeSegment: DashboardSegmentKey | null
  onSegmentClick: (key: DashboardSegmentKey) => void
}

export function DashboardStatusDonut({
  data,
  activeSegment,
  onSegmentClick,
}: DashboardStatusDonutProps) {
  const chartData = data.filter((d) => d.count > 0)

  if (chartData.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        Gösterilecek durum verisi yok
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={110}
          paddingAngle={2}
          onClick={(entry) => {
            const item = entry as unknown as StatusDistributionItem
            if (item?.key) onSegmentClick(item.key)
          }}
          style={{ cursor: "pointer" }}
        >
          {chartData.map((entry) => (
            <Cell
              key={entry.key}
              fill={entry.color}
              stroke={activeSegment === entry.key ? "#0f172a" : entry.color}
              strokeWidth={activeSegment === entry.key ? 3 : 1}
              opacity={activeSegment && activeSegment !== entry.key ? 0.45 : 1}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, _name, props) => [
            value,
            (props.payload as StatusDistributionItem).label,
          ]}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
