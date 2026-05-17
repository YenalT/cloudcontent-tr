export class AiConfigurationError extends Error {
  readonly code = "AI_CONFIGURATION_ERROR"

  constructor(message: string) {
    super(message)
    this.name = "AiConfigurationError"
  }
}

export class AzureOpenAiError extends Error {
  readonly code = "AZURE_OPENAI_ERROR"
  readonly statusCode?: number

  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = "AzureOpenAiError"
    this.statusCode = statusCode
  }
}

export type DocumentIntelligenceErrorDetails = {
  statusCode?: number
  azureErrorCode?: string
  azureInnerCode?: string
  azureInnerMessage?: string
  logMetadata?: Record<string, unknown>
}

export class DocumentIntelligenceError extends Error {
  readonly code = "DOCUMENT_INTELLIGENCE_ERROR"
  readonly statusCode?: number
  readonly azureErrorCode?: string
  readonly azureInnerCode?: string
  readonly azureInnerMessage?: string
  readonly logMetadata?: Record<string, unknown>

  constructor(message: string, details?: number | DocumentIntelligenceErrorDetails) {
    super(message)
    this.name = "DocumentIntelligenceError"
    if (typeof details === "number") {
      this.statusCode = details
      return
    }
    if (details) {
      this.statusCode = details.statusCode
      this.azureErrorCode = details.azureErrorCode
      this.azureInnerCode = details.azureInnerCode
      this.azureInnerMessage = details.azureInnerMessage
      this.logMetadata = details.logMetadata
    }
  }
}

export function isAiConfigurationError(error: unknown): error is AiConfigurationError {
  return error instanceof AiConfigurationError
}

export function isDocumentIntelligenceError(
  error: unknown
): error is DocumentIntelligenceError {
  return error instanceof DocumentIntelligenceError
}

export class OpenAiImageError extends Error {
  readonly code = "OPENAI_IMAGE_ERROR"
  readonly statusCode?: number
  readonly openAiErrorCode?: string
  readonly logMetadata?: Record<string, unknown>

  constructor(message: string, details?: { statusCode?: number; openAiErrorCode?: string; logMetadata?: Record<string, unknown> }) {
    super(message)
    this.name = "OpenAiImageError"
    if (details) {
      this.statusCode = details.statusCode
      this.openAiErrorCode = details.openAiErrorCode
      this.logMetadata = details.logMetadata
    }
  }
}

export function isOpenAiImageError(error: unknown): error is OpenAiImageError {
  return error instanceof OpenAiImageError
}
