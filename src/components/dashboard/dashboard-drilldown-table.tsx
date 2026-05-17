"use client"

import Link from "next/link"
import { ExternalLink, Instagram, RefreshCw } from "lucide-react"
import { useTransition } from "react"

import { retryInstagramZapierWebhook } from "@/lib/actions/instagram-zapier"
import type { DashboardRecord } from "@/lib/data/dashboard"
import { SEGMENT_META, type DashboardSegmentKey } from "@/lib/dashboard/status-mapping"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/utils"

type DashboardDrilldownTableProps = {
  segment: DashboardSegmentKey | null
  records: DashboardRecord[]
  loading?: boolean
  onRetryComplete?: (message: string, ok: boolean) => void
}

function exportCsv(records: DashboardRecord[], segmentLabel: string) {
  const headers = [
    "Tür",
    "Başlık",
    "Durum",
    "Kaynak",
    "Güncellendi",
    "Yayın",
    "Hata",
    "Adım",
    "Zapier",
    "Yeniden deneme",
  ]
  const rows = records.map((r) => [
    r.recordType === "article" ? "Makale" : "Instagram",
    r.title,
    r.status,
    r.source,
    r.updatedAt,
    r.publishedAt ?? "",
    r.errorMessage ?? "",
    r.failedStep ?? "",
    r.zapierDeliveryStatus ?? "",
    r.retryCount?.toString() ?? "",
  ])
  const csv = [headers, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `dashboard-${segmentLabel}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function DashboardDrilldownTable({
  segment,
  records,
  loading = false,
  onRetryComplete,
}: DashboardDrilldownTableProps) {
  const [isPending, startTransition] = useTransition()

  if (!segment) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Detay tablosu için grafikte bir durum seçin veya legend&apos;a tıklayın.
      </div>
    )
  }

  const segmentLabel = SEGMENT_META[segment].label

  function handleRetry(postId: string) {
    startTransition(async () => {
      const result = await retryInstagramZapierWebhook(postId)
      onRetryComplete?.(result.message ?? (result.ok ? "Tekrar gönderildi" : "Hata"), result.ok)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{segmentLabel} kayıtları</h3>
          <p className="text-xs text-muted-foreground">
            {loading ? "Yükleniyor…" : `${records.length} kayıt`}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={records.length === 0 || loading}
          onClick={() => exportCsv(records, segment)}
        >
          CSV dışa aktar
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Bu durum için kayıt bulunamadı.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tür</TableHead>
                <TableHead>Başlık</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Kaynak</TableHead>
                <TableHead>Güncellendi</TableHead>
                <TableHead>Yayın</TableHead>
                <TableHead>Hata / Zapier</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((row) => (
                <TableRow key={`${row.recordType}-${row.id}`}>
                  <TableCell className="text-xs">
                    {row.recordType === "article" ? "Makale" : "Instagram"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate font-medium">
                    {row.title}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.source}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(row.updatedAt)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {row.publishedAt ? formatDate(row.publishedAt) : "—"}
                  </TableCell>
                  <TableCell className="max-w-[180px] text-xs">
                    {row.errorMessage ? (
                      <span className="text-destructive line-clamp-2">{row.errorMessage}</span>
                    ) : null}
                    {row.failedStep ? (
                      <p className="text-muted-foreground">Adım: {row.failedStep}</p>
                    ) : null}
                    {row.retryCount != null && row.retryCount > 0 ? (
                      <p className="text-muted-foreground">
                        Deneme: {row.retryCount}
                        {row.lastRetryAt ? ` · ${formatDate(row.lastRetryAt)}` : ""}
                      </p>
                    ) : null}
                    {row.suggestedAction ? (
                      <p className="text-amber-700 dark:text-amber-300 line-clamp-2">
                        {row.suggestedAction}
                      </p>
                    ) : null}
                    {row.zapierDeliveryStatus ? (
                      <StatusBadge status={row.zapierDeliveryStatus} />
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {row.recordType === "article" ? (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/articles`}>
                            <ExternalLink className="h-3.5 w-3.5" />
                            Makale
                          </Link>
                        </Button>
                      ) : (
                        <>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/instagram?articleId=${row.articleId}`}>
                              <Instagram className="h-3.5 w-3.5" />
                              IG
                            </Link>
                          </Button>
                          {(row.status === "failed" || row.status === "sent_to_zapier") &&
                          row.zapierDeliveryStatus === "failed" ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isPending}
                              onClick={() => handleRetry(row.id)}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
