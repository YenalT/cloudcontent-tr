export class ZapierWebhookError extends Error {
  readonly code = "ZAPIER_WEBHOOK_ERROR"
  readonly httpStatus?: number
  readonly retryable: boolean
  readonly logMetadata?: Record<string, unknown>

  constructor(
    message: string,
    options?: {
      httpStatus?: number
      retryable?: boolean
      logMetadata?: Record<string, unknown>
    }
  ) {
    super(message)
    this.name = "ZapierWebhookError"
    this.httpStatus = options?.httpStatus
    this.retryable = options?.retryable ?? false
    this.logMetadata = options?.logMetadata
  }
}

export function isZapierWebhookError(error: unknown): error is ZapierWebhookError {
  return error instanceof ZapierWebhookError
}

export function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 502 || status === 503 || status === 504
}

export function toAdminZapierErrorMessage(error: unknown): string {
  if (error instanceof ZapierWebhookError) {
    return error.message
  }
  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.message.includes("timeout")) {
      return "Zapier webhook zaman aşımına uğradı. URL’yi ve ağ bağlantısını kontrol edin."
    }
    if (error.message.includes("fetch failed") || error.message.includes("ECONNREFUSED")) {
      return "Zapier’e bağlanılamadı. Ağ bağlantısını kontrol edin."
    }
    return error.message
  }
  return "Zapier webhook gönderimi başarısız."
}

function validateWebhookUrlFormat(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new ZapierWebhookError("Geçersiz webhook URL’si. https://hooks.zapier.com/... biçiminde olmalı.")
  }

  if (parsed.protocol !== "https:") {
    throw new ZapierWebhookError("Webhook URL https:// ile başlamalı.")
  }

  if (!parsed.hostname.endsWith("hooks.zapier.com")) {
    throw new ZapierWebhookError(
      "Webhook URL bir Zapier catch hook adresi olmalı (hooks.zapier.com)."
    )
  }
}

export function assertValidZapierWebhookUrl(url: string): string {
  const trimmed = url.trim()
  validateWebhookUrlFormat(trimmed)
  return trimmed.replace(/\/+$/, "")
}
