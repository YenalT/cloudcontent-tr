"use client"

import type { DashboardFilters } from "@/lib/dashboard/filters"
import {
  DASHBOARD_SEGMENT_ORDER,
  SEGMENT_META,
  type DashboardSegmentKey,
} from "@/lib/dashboard/status-mapping"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

type DashboardFiltersBarProps = {
  filters: DashboardFilters
  onChange: (filters: DashboardFilters) => void
  activeSegment?: DashboardSegmentKey | null
  onSegmentChange?: (segment: DashboardSegmentKey | null) => void
  disabled?: boolean
}

export function DashboardFiltersBar({
  filters,
  onChange,
  activeSegment = null,
  onSegmentChange,
  disabled = false,
}: DashboardFiltersBarProps) {
  return (
    <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-2 lg:grid-cols-6">
      <div className="space-y-2">
        <Label htmlFor="date-range">Tarih aralığı</Label>
        <select
          id="date-range"
          className={selectClass}
          value={filters.dateRange}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              ...filters,
              dateRange: e.target.value as DashboardFilters["dateRange"],
            })
          }
        >
          <option value="today">Bugün</option>
          <option value="7d">Son 7 gün</option>
          <option value="30d">Son 30 gün</option>
          <option value="month">Bu ay</option>
          <option value="custom">Özel aralık</option>
        </select>
      </div>

      {filters.dateRange === "custom" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="date-from">Başlangıç</Label>
            <Input
              id="date-from"
              type="date"
              disabled={disabled}
              value={filters.dateFrom ?? ""}
              onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-to">Bitiş</Label>
            <Input
              id="date-to"
              type="date"
              disabled={disabled}
              value={filters.dateTo ?? ""}
              onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
            />
          </div>
        </>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="content-type">İçerik türü</Label>
        <select
          id="content-type"
          className={selectClass}
          value={filters.contentType}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              ...filters,
              contentType: e.target.value as DashboardFilters["contentType"],
            })
          }
        >
          <option value="all">Tümü</option>
          <option value="articles">Makaleler</option>
          <option value="instagram">Instagram</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status-filter">Durum</Label>
        <select
          id="status-filter"
          className={selectClass}
          value={activeSegment ?? ""}
          disabled={disabled}
          onChange={(e) => {
            const value = e.target.value as DashboardSegmentKey | ""
            onSegmentChange?.(value || null)
          }}
        >
          <option value="">Tümü</option>
          {DASHBOARD_SEGMENT_ORDER.map((key) => (
            <option key={key} value={key}>
              {SEGMENT_META[key].label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="source-type">Kaynak</Label>
        <select
          id="source-type"
          className={selectClass}
          value={filters.sourceType}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              ...filters,
              sourceType: e.target.value as DashboardFilters["sourceType"],
            })
          }
        >
          <option value="all">Tümü</option>
          <option value="url">URL</option>
          <option value="document">Belge</option>
          <option value="manual">Manuel</option>
        </select>
      </div>
    </div>
  )
}
