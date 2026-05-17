"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { AlertCircle, BarChart3, Loader2 } from "lucide-react"

import {
  fetchDashboardReport,
  fetchRecordsByStatus,
} from "@/lib/actions/dashboard"
import type {
  DashboardRecord,
  InstagramDeliveryPoint,
  RadialMetrics,
  StatusDistributionItem,
  TimelinePoint,
} from "@/lib/data/dashboard"
import type { DashboardStats } from "@/lib/data/dashboard"
import type { DashboardFilters } from "@/lib/dashboard/filters"
import { parseDashboardFilters } from "@/lib/dashboard/filters"
import type { DashboardSegmentKey } from "@/lib/dashboard/status-mapping"
import { DashboardSummaryCards } from "@/components/dashboard/dashboard-summary-cards"
import { DashboardFiltersBar } from "@/components/dashboard/dashboard-filters"
import { DashboardStatusDonut } from "@/components/dashboard/dashboard-status-donut"
import { DashboardLegend } from "@/components/dashboard/dashboard-legend"
import {
  DashboardDeliveryLineChart,
  DashboardPublishingBarChart,
  DashboardRadialMetrics,
} from "@/components/dashboard/dashboard-charts"
import { DashboardDrilldownTable } from "@/components/dashboard/dashboard-drilldown-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type DashboardAnalyticsProps = {
  initialStats: DashboardStats
  initialDistribution: StatusDistributionItem[]
  initialTimeline: TimelinePoint[]
  initialDelivery: InstagramDeliveryPoint[]
  initialRadial: RadialMetrics
  initialFilters: DashboardFilters
}

export function DashboardAnalytics({
  initialStats,
  initialDistribution,
  initialTimeline,
  initialDelivery,
  initialRadial,
  initialFilters,
}: DashboardAnalyticsProps) {
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters)
  const [stats, setStats] = useState(initialStats)
  const [distribution, setDistribution] = useState(initialDistribution)
  const [timeline, setTimeline] = useState(initialTimeline)
  const [delivery, setDelivery] = useState(initialDelivery)
  const [radial, setRadial] = useState(initialRadial)
  const [activeSegment, setActiveSegment] = useState<DashboardSegmentKey | null>(null)
  const [records, setRecords] = useState<DashboardRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  )
  const [isPending, startTransition] = useTransition()

  const loadReport = useCallback((nextFilters: DashboardFilters) => {
    setError(null)
    startTransition(async () => {
      try {
        const report = await fetchDashboardReport(nextFilters)
        setStats(report.stats)
        setDistribution(report.distribution)
        setTimeline(report.timeline)
        setDelivery(report.delivery)
        setRadial(report.radial)
        if (activeSegment) {
          setRecordsLoading(true)
          const rows = await fetchRecordsByStatus(activeSegment, nextFilters)
          setRecords(rows)
          setRecordsLoading(false)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Rapor yüklenemedi")
      }
    })
  }, [activeSegment])

  useEffect(() => {
    const parsed = parseDashboardFilters(filters)
    const timer = setTimeout(() => loadReport(parsed), 350)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounced filter refresh
  }, [filters])

  function handleSegmentSelect(segment: DashboardSegmentKey) {
    setActiveSegment(segment)
    setRecordsLoading(true)
    startTransition(async () => {
      try {
        const rows = await fetchRecordsByStatus(segment, filters)
        setRecords(rows)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kayıtlar yüklenemedi")
      } finally {
        setRecordsLoading(false)
      }
    })
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <DashboardFiltersBar
        filters={filters}
        onChange={setFilters}
        activeSegment={activeSegment}
        onSegmentChange={(segment) => {
          if (segment) handleSegmentSelect(segment)
          else {
            setActiveSegment(null)
            setRecords([])
          }
        }}
        disabled={isPending}
      />

      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Rapor güncelleniyor…
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {banner ? (
        <p
          className={
            banner.type === "success"
              ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              : "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {banner.text}
        </p>
      ) : null}

      <DashboardSummaryCards stats={stats} />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Durum dağılımı
            </CardTitle>
            <CardDescription>
              Dilim veya legend&apos;a tıklayarak kayıtları filtreleyin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DashboardStatusDonut
              data={distribution}
              activeSegment={activeSegment}
              onSegmentClick={handleSegmentSelect}
            />
            <DashboardLegend
              items={distribution}
              activeSegment={activeSegment}
              onSelect={handleSegmentSelect}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Oranlar</CardTitle>
            <CardDescription>Instagram onay ve yayın başarısı</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardRadialMetrics metrics={radial} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Günlük makale aktivitesi</CardTitle>
            <CardDescription>Üretim ve yayın sayıları</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardPublishingBarChart data={timeline} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Zapier teslimat</CardTitle>
            <CardDescription>Başarılı vs başarısız webhook</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardDeliveryLineChart data={delivery} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detay tablosu</CardTitle>
          <CardDescription>
            Seçilen duruma göre makale ve Instagram kayıtları
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardDrilldownTable
            segment={activeSegment}
            records={records}
            loading={recordsLoading}
            onRetryComplete={(text, ok) =>
              setBanner({ type: ok ? "success" : "error", text })
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}

export function DashboardAnalyticsSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-[360px] w-full" />
    </div>
  )
}
