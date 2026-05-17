import { z } from "zod"

export const dashboardDateRangeSchema = z.enum([
  "today",
  "7d",
  "30d",
  "month",
  "custom",
])

export const dashboardContentTypeSchema = z.enum(["all", "articles", "instagram"])

export const dashboardSourceTypeSchema = z.enum(["all", "url", "document", "manual"])

export const dashboardFiltersSchema = z.object({
  dateRange: dashboardDateRangeSchema.default("30d"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  contentType: dashboardContentTypeSchema.default("all"),
  sourceType: dashboardSourceTypeSchema.default("all"),
  status: z.string().optional(),
})

export type DashboardFilters = z.infer<typeof dashboardFiltersSchema>

export type ResolvedDateRange = {
  from: Date
  to: Date
}

export function resolveDateRange(filters: DashboardFilters): ResolvedDateRange {
  const now = new Date()
  const end = filters.dateTo ? endOfDay(new Date(filters.dateTo)) : endOfDay(now)

  if (filters.dateRange === "custom" && filters.dateFrom) {
    return { from: startOfDay(new Date(filters.dateFrom)), to: end }
  }

  const start = startOfDay(now)
  switch (filters.dateRange) {
    case "today":
      return { from: start, to: end }
    case "7d": {
      const from = new Date(start)
      from.setDate(from.getDate() - 6)
      return { from, to: end }
    }
    case "30d": {
      const from = new Date(start)
      from.setDate(from.getDate() - 29)
      return { from, to: end }
    }
    case "month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from, to: end }
    }
    default: {
      const from = new Date(start)
      from.setDate(from.getDate() - 29)
      return { from, to: end }
    }
  }
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export function parseDashboardFilters(
  input?: Partial<DashboardFilters>
): DashboardFilters {
  return dashboardFiltersSchema.parse({
    dateRange: input?.dateRange ?? "30d",
    dateFrom: input?.dateFrom,
    dateTo: input?.dateTo,
    contentType: input?.contentType ?? "all",
    sourceType: input?.sourceType ?? "all",
    status: input?.status,
  })
}
