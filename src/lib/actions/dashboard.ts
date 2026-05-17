"use server"

import type { DashboardSegmentKey } from "@/lib/dashboard/status-mapping"
import type { DashboardFilters } from "@/lib/dashboard/filters"
import {
  getDashboardReportBundle,
  getDashboardStats,
  getInstagramDeliveryStats,
  getPublishingTimeline,
  getRadialMetrics,
  getRecordsByStatus,
  getStatusDistribution,
} from "@/lib/data/dashboard"

export async function fetchDashboardReport(filters?: Partial<DashboardFilters>) {
  return getDashboardReportBundle(filters)
}

export async function fetchDashboardStats(filters?: Partial<DashboardFilters>) {
  return getDashboardStats(filters)
}

export async function fetchStatusDistribution(filters?: Partial<DashboardFilters>) {
  return getStatusDistribution(filters)
}

export async function fetchPublishingTimeline(filters?: Partial<DashboardFilters>) {
  return getPublishingTimeline(filters)
}

export async function fetchInstagramDeliveryStats(filters?: Partial<DashboardFilters>) {
  return getInstagramDeliveryStats(filters)
}

export async function fetchRadialMetrics(filters?: Partial<DashboardFilters>) {
  return getRadialMetrics(filters)
}

export async function fetchRecordsByStatus(
  segment: DashboardSegmentKey,
  filters?: Partial<DashboardFilters>
) {
  return getRecordsByStatus(segment, filters)
}
