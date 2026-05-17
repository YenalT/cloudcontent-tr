import { OpenAiImageError } from "@/lib/ai/errors"

export type OpenAiErrorBody = {
  error?: {
    message?: string
    type?: string
    code?: string
    param?: string
  }
}

export function parseOpenAiImageError(
  httpStatus: number,
  body: OpenAiErrorBody | null
): { adminMessage: string; logMetadata: Record<string, unknown> } {
  const errorType = body?.error?.type?.trim()
  const errorCode = body?.error?.code?.trim()
  const errorMessage = body?.error?.message?.trim()

  const logMetadata: Record<string, unknown> = {
    httpStatus,
    ...(errorType ? { openAiErrorType: errorType } : {}),
    ...(errorCode ? { openAiErrorCode: errorCode } : {}),
    ...(errorMessage ? { openAiErrorMessage: errorMessage } : {}),
  }

  if (httpStatus === 401) {
    return {
      adminMessage:
        "OpenAI API anahtarı geçersiz. Ayarlar’dan yeni bir anahtar girin veya OPENAI_API_KEY ortam değişkenini kontrol edin.",
      logMetadata,
    }
  }

  if (httpStatus === 403) {
    return {
      adminMessage: "OpenAI erişimi reddedildi. API anahtarının görüntü üretimine yetkili olduğundan emin olun.",
      logMetadata,
    }
  }

  if (httpStatus === 429) {
    return {
      adminMessage: "OpenAI hız limiti aşıldı. Bir süre sonra tekrar deneyin.",
      logMetadata,
    }
  }

  if (errorCode === "invalid_api_key" || errorType === "invalid_request_error") {
    if (errorMessage?.toLowerCase().includes("api key")) {
      return {
        adminMessage: "OpenAI API anahtarı geçersiz veya süresi dolmuş.",
        logMetadata,
      }
    }
  }

  if (errorMessage) {
    return { adminMessage: errorMessage, logMetadata }
  }

  return {
    adminMessage: `OpenAI görüntü isteği başarısız (HTTP ${httpStatus}).`,
    logMetadata,
  }
}

export function throwOpenAiImageFromResponse(httpStatus: number, body: OpenAiErrorBody | null): never {
  const parsed = parseOpenAiImageError(httpStatus, body)
  throw new OpenAiImageError(parsed.adminMessage, {
    statusCode: httpStatus,
    openAiErrorCode: body?.error?.code,
    logMetadata: parsed.logMetadata,
  })
}
