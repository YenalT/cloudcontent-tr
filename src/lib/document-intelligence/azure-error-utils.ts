import { DocumentIntelligenceError } from "@/lib/ai/errors"

export type AzureDocumentIntelligenceErrorBody = {
  error?: {
    code?: string
    message?: string
    innererror?: {
      code?: string
      message?: string
    }
    details?: Array<{
      code?: string
      message?: string
    }>
  }
}

export type ParsedAzureDocumentIntelligenceError = {
  httpStatus: number
  errorCode?: string
  errorMessage?: string
  innerCode?: string
  innerMessage?: string
  adminMessage: string
  logMetadata: {
    httpStatus: number
    azureErrorCode?: string
    azureErrorMessage?: string
    azureInnerCode?: string
    azureInnerMessage?: string
  }
}

function pickDetailMessage(body: AzureDocumentIntelligenceErrorBody | null): string | undefined {
  const detail = body?.error?.details?.find((d) => d.message?.trim())
  return detail?.message?.trim()
}

/**
 * Maps Azure Document Intelligence REST errors to admin-friendly Turkish messages.
 * Never includes API keys or request secrets.
 */
export function parseAzureDocumentIntelligenceError(
  httpStatus: number,
  body: AzureDocumentIntelligenceErrorBody | null
): ParsedAzureDocumentIntelligenceError {
  const errorCode = body?.error?.code?.trim() || undefined
  const errorMessage = body?.error?.message?.trim() || undefined
  const innerCode = body?.error?.innererror?.code?.trim() || undefined
  const innerMessage = body?.error?.innererror?.message?.trim() || undefined
  const detailMessage = pickDetailMessage(body)

  const adminMessage = resolveAdminMessage({
    httpStatus,
    errorCode,
    errorMessage,
    innerCode,
    innerMessage,
    detailMessage,
  })

  return {
    httpStatus,
    errorCode,
    errorMessage,
    innerCode,
    innerMessage,
    adminMessage,
    logMetadata: {
      httpStatus,
      ...(errorCode ? { azureErrorCode: errorCode } : {}),
      ...(errorMessage ? { azureErrorMessage: errorMessage } : {}),
      ...(innerCode ? { azureInnerCode: innerCode } : {}),
      ...(innerMessage ? { azureInnerMessage: innerMessage } : {}),
    },
  }
}

function resolveAdminMessage(ctx: {
  httpStatus: number
  errorCode?: string
  errorMessage?: string
  innerCode?: string
  innerMessage?: string
  detailMessage?: string
}): string {
  const { httpStatus, errorCode, errorMessage, innerCode, innerMessage, detailMessage } = ctx
  const code = innerCode ?? errorCode

  if (code === "NotSupportedApiVersion") {
    return (
      innerMessage ??
      "API sürümü bu kaynak için desteklenmiyor. Ayarlar’daki API sürümünü kontrol edin (ör. 2024-11-30)."
    )
  }

  if (code === "InvalidContent") {
    if (
      innerMessage?.toLowerCase().includes("corrupt") ||
      innerMessage?.toLowerCase().includes("unsupported")
    ) {
      return (
        innerMessage ??
        "Dosya bozuk veya desteklenmeyen biçimde. PDF, DOCX veya PPTX dosyasının açılabildiğinden emin olun."
      )
    }
    return (
      innerMessage ??
      "Dosya okunamadı — bozuk olabilir veya desteklenmeyen biçimde. Geçerli bir PDF, DOCX veya PPTX yükleyin."
    )
  }

  if (code === "UnsupportedContent" || code === "UnsupportedMediaType") {
    return (
      innerMessage ??
      "Dosya türü desteklenmiyor. Yalnızca PDF, DOCX ve PPTX yükleyebilirsiniz."
    )
  }

  if (code === "AuthorizationFailed" || httpStatus === 401) {
    return "API anahtarı geçersiz veya bu endpoint ile eşleşmiyor. Azure portal’dan doğru kaynağın anahtarını kullanın."
  }

  if (httpStatus === 403 || errorCode === "Forbidden") {
    return "Erişim reddedildi. API anahtarı ve endpoint aynı Document Intelligence kaynağına ait olmalıdır."
  }

  if (httpStatus === 404 || errorCode === "NotFound") {
    return "Endpoint bulunamadı. Document Intelligence kaynağının kök URL’sini kullandığınızdan emin olun (/documentintelligence eklemeyin)."
  }

  if (httpStatus === 415) {
    return "İstek içerik türü desteklenmiyor. Dosya biçimini kontrol edin (PDF, DOCX, PPTX)."
  }

  if (innerMessage && innerMessage !== "Invalid request.") {
    return innerMessage
  }

  if (detailMessage) {
    return detailMessage
  }

  if (errorMessage && errorMessage !== "Invalid request.") {
    return errorMessage
  }

  if (httpStatus >= 500) {
    return "Azure Document Intelligence geçici olarak kullanılamıyor. Bir süre sonra tekrar deneyin."
  }

  return (
    innerMessage ??
    errorMessage ??
    `Azure Document Intelligence isteği başarısız (HTTP ${httpStatus}).`
  )
}

export function throwDocumentIntelligenceFromAzureResponse(
  httpStatus: number,
  body: AzureDocumentIntelligenceErrorBody | null
): never {
  const parsed = parseAzureDocumentIntelligenceError(httpStatus, body)
  throw new DocumentIntelligenceError(parsed.adminMessage, {
    statusCode: parsed.httpStatus,
    azureErrorCode: parsed.errorCode,
    azureInnerCode: parsed.innerCode,
    azureInnerMessage: parsed.innerMessage,
    logMetadata: parsed.logMetadata,
  })
}

export function getAzureAnalyzeContentType(): string {
  return "application/octet-stream"
}
