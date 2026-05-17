import { Suspense } from "react"

import {
  DashboardAnalytics,
  DashboardAnalyticsSkeleton,
} from "@/components/dashboard/dashboard-analytics"
import { PageHeader } from "@/components/shared/page-header"
import { getDashboardReportBundle } from "@/lib/data/dashboard"

/** Avoid static prerender at build time (Prisma requires DATABASE_URL at runtime only). */
export const dynamic = "force-dynamic"

async function DashboardReportContent() {
  const report = await getDashboardReportBundle()

  return (
    <DashboardAnalytics
      initialStats={report.stats}
      initialDistribution={report.distribution}
      initialTimeline={report.timeline}
      initialDelivery={report.delivery}
      initialRadial={report.radial}
      initialFilters={report.filters}
    />
  )
}

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Makale ve Instagram/Zapier yayın raporları — grafiklere tıklayarak detaylara inin"
      />
      <Suspense fallback={<DashboardAnalyticsSkeleton />}>
        <DashboardReportContent />
      </Suspense>
    </>
  )
}
