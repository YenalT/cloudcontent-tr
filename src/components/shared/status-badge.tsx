import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const statusLabels: Record<string, string> = {
  pending: "Bekliyor",
  processing: "İşleniyor",
  completed: "Tamamlandı",
  failed: "Başarısız",
  draft: "Taslak",
  review: "İncelemede",
  generated: "Üretildi",
  pending_review: "İncelemede",
  published: "Yayında",
  scheduled: "Planlandı",
  success: "Başarılı",
  running: "Çalışıyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  sent_to_zapier: "Zapier'e gönderildi",
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "success" | "warning" | "outline"> = {
  pending: "secondary",
  processing: "warning",
  completed: "success",
  failed: "destructive",
  draft: "secondary",
  review: "warning",
  generated: "secondary",
  pending_review: "warning",
  published: "success",
  scheduled: "warning",
  success: "success",
  running: "warning",
  approved: "success",
  rejected: "destructive",
  sent_to_zapier: "success",
}

export function StatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  return (
    <Badge variant={statusVariant[status] ?? "outline"} className={cn(className)}>
      {statusLabels[status] ?? status}
    </Badge>
  )
}
