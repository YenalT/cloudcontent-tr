"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { InstagramDeliveryPoint, TimelinePoint } from "@/lib/data/dashboard"
import type { RadialMetrics } from "@/lib/data/dashboard"

type DashboardBarChartProps = {
  data: TimelinePoint[]
}

export function DashboardPublishingBarChart({ data }: DashboardBarChartProps) {
  if (data.every((d) => d.generated === 0 && d.published === 0)) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        Bu dönemde makale aktivitesi yok
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip labelFormatter={(v) => `Tarih: ${v}`} />
        <Legend />
        <Bar dataKey="generated" name="Üretilen" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="published" name="Yayınlanan" fill="#22c55e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

type DashboardLineChartProps = {
  data: InstagramDeliveryPoint[]
}

export function DashboardDeliveryLineChart({ data }: DashboardLineChartProps) {
  if (data.every((d) => d.success === 0 && d.failure === 0)) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        Zapier teslimat kaydı yok
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip labelFormatter={(v) => `Tarih: ${v}`} />
        <Legend />
        <Line
          type="monotone"
          dataKey="success"
          name="Başarılı"
          stroke="#14b8a6"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="failure"
          name="Başarısız"
          stroke="#ea580c"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

type DashboardRadialMetricsProps = {
  metrics: RadialMetrics
}

function RadialGauge({
  label,
  value,
  color,
  sublabel,
}: {
  label: string
  value: number
  color: string
  sublabel: string
}) {
  const r = 52
  const c = 2 * Math.PI * r
  const offset = c - (value / 100) * c

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={140} height={140} viewBox="0 0 140 140" className="-rotate-90">
        <circle
          cx={70}
          cy={70}
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-muted"
          strokeWidth={10}
        />
        <circle
          cx={70}
          cy={70}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="-mt-20 text-center">
        <p className="text-2xl font-bold">{value}%</p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="text-center text-xs text-muted-foreground">{sublabel}</p>
    </div>
  )
}

export function DashboardRadialMetrics({ metrics }: DashboardRadialMetricsProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <RadialGauge
        label="Onay oranı"
        value={metrics.approvalRate}
        color="#3b82f6"
        sublabel={metrics.approvalLabel}
      />
      <RadialGauge
        label="Yayın başarısı"
        value={metrics.publishingSuccessRate}
        color="#14b8a6"
        sublabel={metrics.publishingLabel}
      />
    </div>
  )
}
