"use client"

import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Instagram,
  Send,
  XCircle,
} from "lucide-react"

import { StatCard } from "@/components/shared/stat-card"
import type { DashboardStats } from "@/lib/data/dashboard"

type DashboardSummaryCardsProps = {
  stats: DashboardStats
}

export function DashboardSummaryCards({ stats }: DashboardSummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
      <StatCard title="Toplam makale" value={stats.totalArticles} icon={FileText} />
      <StatCard title="Yayında" value={stats.publishedArticles} icon={BookOpen} />
      <StatCard title="Onaylı (IG)" value={stats.approvedArticles} icon={CheckCircle2} />
      <StatCard title="Reddedildi (IG)" value={stats.instagramRejected} icon={XCircle} />
      <StatCard title="Başarısız makale" value={stats.failedArticles} icon={AlertCircle} />
      <StatCard title="Taslak makale" value={stats.draftArticles} icon={FileText} />
      <StatCard title="IG üretildi" value={stats.instagramGenerated} icon={Instagram} />
      <StatCard title="Zapier'e gönderildi" value={stats.instagramSentToZapier} icon={Send} />
      <StatCard title="IG yayında" value={stats.instagramPublished} icon={Instagram} />
      <StatCard title="IG başarısız" value={stats.instagramFailed} icon={AlertCircle} />
      <StatCard title="Onay bekliyor" value={stats.pendingApproval} icon={Clock} />
    </div>
  )
}
