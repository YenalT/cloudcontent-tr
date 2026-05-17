export type AzureDocumentIntelligenceRuntimeConfig = {
  endpoint: string
  apiKey: string
  apiVersion: string
  timeoutMs: number
  pollIntervalMs: number
  maxPollAttempts: number
}

export type AzureAnalyzeParagraph = {
  content: string
  pageNumber?: number
}

export type AzureDocumentAnalyzeResult = {
  rawContent: string
  paragraphs: AzureAnalyzeParagraph[]
  pageCount: number
  modelId: string
}

type AzureAnalyzeOperation = {
  status: "notStarted" | "running" | "succeeded" | "failed" | "canceled"
  error?: {
    message?: string
    code?: string
    innererror?: { message?: string; code?: string }
  }
  analyzeResult?: {
    content?: string
    modelId?: string
    paragraphs?: Array<{
      content?: string
      boundingRegions?: Array<{ pageNumber?: number }>
    }>
    pages?: unknown[]
  }
}

export type { AzureAnalyzeOperation }
