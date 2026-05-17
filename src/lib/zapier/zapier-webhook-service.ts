import "server-only"

import {
  assertValidZapierWebhookUrl,
  isRetryableHttpStatus,
  ZapierWebhookError,
} from "@/lib/zapier/zapier-webhook-errors"
import type {
  ZapierTestWebhookPayload,
  ZapierWebhookDeliveryResult,
  ZapierWebhookRuntimeConfig,
} from "@/lib/zapier/zapier-webhook-types"

const MAX_RESPONSE_BODY_LOG = 8_000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function truncateBody(body: string): string {
  if (body.length <= MAX_RESPONSE_BODY_LOG) return body
  return `${body.slice(0, MAX_RESPONSE_BODY_LOG)}…`
}

function parseAdminError(httpStatus: number, bodyText: string): string {
  if (httpStatus === 404) {
    return "Zapier webhook bulunamadı (404). Catch hook URL’sini kontrol edin."
  }
  if (httpStatus === 410) {
    return "Zapier webhook artık geçerli değil (410). Yeni bir catch hook oluşturun."
  }
  if (isRetryableHttpStatus(httpStatus)) {
    return `Zapier geçici olarak kullanılamıyor (HTTP ${httpStatus}). Tekrar deneyin.`
  }
  if (httpStatus >= 500) {
    return `Zapier sunucu hatası (HTTP ${httpStatus}).`
  }
  if (httpStatus >= 400) {
    return `Zapier isteği reddetti (HTTP ${httpStatus}). Payload veya URL’yi kontrol edin.`
  }
  if (bodyText) {
    return `Zapier yanıtı beklenmeyen (HTTP ${httpStatus}).`
  }
  return `Zapier webhook başarısız (HTTP ${httpStatus}).`
}

async function postWebhookOnce(
  webhookUrl: string,
  payload: unknown,
  timeoutMs: number
): Promise<{
  httpStatus: number
  responseBody: string
  responseHeaders: Record<string, string>
}> {
  const url = assertValidZapierWebhookUrl(webhookUrl)

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  })

  const responseBody = truncateBody(await response.text().catch(() => ""))

  if (!response.ok) {
    throw new ZapierWebhookError(parseAdminError(response.status, responseBody), {
      httpStatus: response.status,
      retryable: isRetryableHttpStatus(response.status),
      logMetadata: {
        httpStatus: response.status,
        responseBodyPreview: responseBody.slice(0, 500),
      },
    })
  }

  const responseHeaders: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value
  })

  return { httpStatus: response.status, responseBody, responseHeaders }
}

export class ZapierWebhookService {
  constructor(private readonly config: ZapierWebhookRuntimeConfig) {}

  async deliver(payload: unknown, initialRetryCount = 0): Promise<ZapierWebhookDeliveryResult> {
    const maxAttempts = Math.max(1, this.config.maxRetries + 1)
    let lastError: ZapierWebhookError | null = null
    let retryCount = initialRetryCount
    const started = Date.now()

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 8000)
        await sleep(backoffMs)
        retryCount += 1
      }

      try {
        const result = await postWebhookOnce(
          this.config.webhookUrl,
          payload,
          this.config.timeoutMs
        )
        return {
          success: true,
          httpStatus: result.httpStatus,
          responseBody: result.responseBody,
          responseHeaders: result.responseHeaders,
          retryCount,
          durationMs: Date.now() - started,
        }
      } catch (error) {
        if (error instanceof ZapierWebhookError) {
          lastError = error
          if (!error.retryable || attempt === maxAttempts - 1) {
            return {
              success: false,
              httpStatus: error.httpStatus,
              errorMessage: error.message,
              errorCode: String(error.httpStatus ?? "webhook_error"),
              retryCount,
              durationMs: Date.now() - started,
            }
          }
          continue
        }

        const message =
          error instanceof Error && error.name === "TimeoutError"
            ? "Zapier webhook zaman aşımına uğradı."
            : error instanceof Error
              ? error.message
              : "Ağ hatası"

        lastError = new ZapierWebhookError(
          error instanceof Error && error.name === "TimeoutError"
            ? "Zapier webhook zaman aşımına uğradı."
            : "Zapier’e bağlanılamadı. Ağ bağlantısını kontrol edin.",
          { retryable: true }
        )

        if (attempt === maxAttempts - 1) {
          return {
            success: false,
            errorMessage: lastError.message,
            errorCode: "network_error",
            retryCount,
            durationMs: Date.now() - started,
          }
        }
      }
    }

    return {
      success: false,
      errorMessage: lastError?.message ?? "Zapier webhook gönderimi başarısız.",
      errorCode: "delivery_failed",
      retryCount,
      durationMs: Date.now() - started,
    }
  }

  async testConnection(): Promise<ZapierWebhookDeliveryResult> {
    const payload: ZapierTestWebhookPayload = {
      event: "connection_test",
      timestamp: new Date().toISOString(),
      source: "cloudcontent-tr",
    }
    return this.deliver(payload, 0)
  }
}
