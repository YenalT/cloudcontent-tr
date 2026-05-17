/** Unified dashboard segment keys for charts, legend, and drill-down. */
export type DashboardSegmentKey =
  | "published"
  | "approved"
  | "pending_approval"
  | "draft"
  | "rejected"
  | "failed"
  | "sent_to_zapier"
  | "instagram_published"
  | "instagram_failed"

export const DASHBOARD_SEGMENT_ORDER: DashboardSegmentKey[] = [
  "published",
  "approved",
  "pending_approval",
  "draft",
  "rejected",
  "failed",
  "sent_to_zapier",
  "instagram_published",
  "instagram_failed",
]

export const SEGMENT_META: Record<
  DashboardSegmentKey,
  { label: string; color: string; description: string }
> = {
  published: {
    label: "Yayında",
    color: "#22c55e",
    description: "Yayınlanmış makaleler",
  },
  approved: {
    label: "Onaylandı",
    color: "#3b82f6",
    description: "Onaylanmış Instagram taslakları",
  },
  pending_approval: {
    label: "Onay Bekliyor",
    color: "#f59e0b",
    description: "İnceleme bekleyen makale ve gönderiler",
  },
  draft: {
    label: "Taslak",
    color: "#94a3b8",
    description: "Taslak makale ve gönderiler",
  },
  rejected: {
    label: "Reddedildi",
    color: "#ef4444",
    description: "Reddedilmiş Instagram gönderileri",
  },
  failed: {
    label: "Başarısız",
    color: "#991b1b",
    description: "Başarısız makaleler",
  },
  sent_to_zapier: {
    label: "Zapier'e Gönderildi",
    color: "#a855f7",
    description: "Zapier webhook'una iletilen gönderiler",
  },
  instagram_published: {
    label: "Instagram Yayında",
    color: "#14b8a6",
    description: "Instagram'da yayınlanmış gönderiler",
  },
  instagram_failed: {
    label: "Instagram Başarısız",
    color: "#ea580c",
    description: "Yayın veya Zapier teslimatı başarısız gönderiler",
  },
}

export function segmentFromArticleStatus(status: string): DashboardSegmentKey | null {
  switch (status.toUpperCase()) {
    case "PUBLISHED":
      return "published"
    case "PENDING_REVIEW":
      return "pending_approval"
    case "DRAFT":
    case "GENERATED":
      return "draft"
    case "FAILED":
      return "failed"
    default:
      return null
  }
}

export function segmentFromSocialStatus(status: string): DashboardSegmentKey | null {
  switch (status.toUpperCase()) {
    case "APPROVED":
      return "approved"
    case "PENDING_REVIEW":
      return "pending_approval"
    case "DRAFT":
      return "draft"
    case "REJECTED":
      return "rejected"
    case "FAILED":
      return "instagram_failed"
    case "SENT_TO_ZAPIER":
      return "sent_to_zapier"
    case "PUBLISHED":
      return "instagram_published"
    default:
      return null
  }
}
