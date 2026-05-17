import "server-only"

import type { Prisma } from "@prisma/client"

import { maskWebhookUrl } from "@/lib/data/zapier-config"
import type { ZapierInstagramPostPayload } from "@/lib/zapier/zapier-webhook-types"
import type { ZapierWebhookDeliveryResult } from "@/lib/zapier/zapier-webhook-types"

export function buildSafePayloadPreview(payload: ZapierInstagramPostPayload): Prisma.InputJsonValue {
  return {
    type: payload.type,
    articleId: payload.articleId,
    articleTitle: payload.articleTitle.slice(0, 200),
    captionPreview: payload.caption.slice(0, 300),
    hashtags: payload.hashtags,
    taggedUsers: payload.taggedUsers,
    taggedUsersCsv: payload.taggedUsersCsv,
    postImageUrl: payload.postImageUrl,
    payloadKeys: Object.keys(payload),
  }
}

export function sanitizeResponseHeaders(
  headers: Record<string, string> | undefined
): Prisma.InputJsonValue | undefined {
  if (!headers) return undefined
  const safe: Record<string, string> = {}
  const allow = ["content-type", "content-length", "date", "server", "x-request-id"]
  for (const key of allow) {
    const value = headers[key] ?? headers[key.toLowerCase()]
    if (value) safe[key] = value.slice(0, 500)
  }
  return safe
}

export function deriveZapierErrorDetails(
  delivery: ZapierWebhookDeliveryResult
): { errorCode: string | null; suggestedAction: string | null } {
  if (delivery.success) {
    return { errorCode: null, suggestedAction: null }
  }

  const status = delivery.httpStatus
  if (status === 404 || status === 410) {
    return {
      errorCode: "webhook_not_found",
      suggestedAction: "Zapier catch hook URL’sini Ayarlar’dan güncelleyin.",
    }
  }
  if (status === 403 || status === 401) {
    return {
      errorCode: "webhook_auth",
      suggestedAction: "Webhook URL ve Zapier Zap erişimini kontrol edin.",
    }
  }
  if (status && status >= 500) {
    return {
      errorCode: "zapier_server_error",
      suggestedAction: "Birkaç dakika sonra «Webhook’u Tekrar Dene» kullanın.",
    }
  }
  if (delivery.errorMessage?.toLowerCase().includes("zaman aşımı")) {
    return {
      errorCode: "timeout",
      suggestedAction: "Ayarlar’da Zapier timeout değerini artırın.",
    }
  }
  return {
    errorCode: delivery.errorCode ?? "delivery_failed",
    suggestedAction:
      delivery.suggestedAction ??
      "Blob görsel URL’sinin tarayıcıda açıldığını doğrulayın; ardından tekrar deneyin.",
  }
}

export function maskWebhookUrlForLog(webhookUrl: string): string {
  return maskWebhookUrl(webhookUrl)
}
