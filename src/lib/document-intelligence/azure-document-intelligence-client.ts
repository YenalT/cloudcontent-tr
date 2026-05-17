import { ApiUsageStatus } from "@prisma/client"

import { DocumentIntelligenceError } from "@/lib/ai/errors"
import type {
  AzureAnalyzeOperation,
  AzureDocumentAnalyzeResult,
  AzureDocumentIntelligenceRuntimeConfig,
} from "@/lib/document-intelligence/azure-document-intelligence-types"
import {
  type AzureDocumentIntelligenceErrorBody,
  getAzureAnalyzeContentType,
  throwDocumentIntelligenceFromAzureResponse,
} from "@/lib/document-intelligence/azure-error-utils"
import { validateDocumentIntelligenceEndpoint } from "@/lib/document-intelligence/endpoint-utils"
import { assertAsciiApiKeyHeaderValue } from "@/lib/http/header-utils"
import { prisma } from "@/lib/prisma"

export type AnalyzeDocumentInput = {
  buffer: Buffer
  mimeType: string
  fileName: string
  purpose: string
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function resolveEndpoint(endpoint: string): string {
  const validation = validateDocumentIntelligenceEndpoint(endpoint)
  if (!validation.ok) {
    throw new DocumentIntelligenceError(validation.message)
  }
  return validation.normalized
}

async function readAzureErrorBody(
  response: Response
): Promise<AzureDocumentIntelligenceErrorBody | null> {
  return (await response.json().catch(() => null)) as AzureDocumentIntelligenceErrorBody | null
}

function throwFromPollFailure(
  httpStatus: number,
  body: AzureDocumentIntelligenceErrorBody | AzureAnalyzeOperation | null
): never {
  const errorBody: AzureDocumentIntelligenceErrorBody | null =
    body && "error" in body && body.error
      ? { error: body.error }
      : (body as AzureDocumentIntelligenceErrorBody | null)
  throwDocumentIntelligenceFromAzureResponse(httpStatus, errorBody)
}

function parseAnalyzeResult(operation: AzureAnalyzeOperation): AzureDocumentAnalyzeResult {
  const analyzeResult = operation.analyzeResult
  if (!analyzeResult) {
    throw new DocumentIntelligenceError("Azure Document Intelligence sonucu boş.")
  }

  const paragraphs =
    analyzeResult.paragraphs
      ?.map((p) => ({
        content: (p.content ?? "").trim(),
        pageNumber: p.boundingRegions?.[0]?.pageNumber,
      }))
      .filter((p) => p.content.length > 0) ?? []

  const rawContent =
    analyzeResult.content?.trim() ||
    paragraphs.map((p) => p.content).join("\n\n") ||
    ""

  if (!rawContent) {
    throw new DocumentIntelligenceError("Belgeden metin çıkarılamadı.")
  }

  return {
    rawContent,
    paragraphs,
    pageCount: analyzeResult.pages?.length ?? 0,
    modelId: analyzeResult.modelId ?? "prebuilt-read",
  }
}

export class AzureDocumentIntelligenceClient {
  constructor(private readonly config: AzureDocumentIntelligenceRuntimeConfig) {}

  async analyzeDocument(input: AnalyzeDocumentInput): Promise<AzureDocumentAnalyzeResult> {
    const endpoint = resolveEndpoint(this.config.endpoint)
    const analyzeUrl = `${endpoint}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=${encodeURIComponent(this.config.apiVersion)}`

    const started = Date.now()
    let status: ApiUsageStatus = ApiUsageStatus.FAILED
    let errorMessage: string | undefined
    let errorLogMetadata: Record<string, unknown> | undefined
    let pageCount = 0

    try {
      const apiKey = assertAsciiApiKeyHeaderValue(
        this.config.apiKey,
        "Document Intelligence API key"
      )

      const analyzeResponse = await fetch(analyzeUrl, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
          "Content-Type": getAzureAnalyzeContentType(),
        },
        body: new Uint8Array(input.buffer),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      })

      if (analyzeResponse.status !== 202) {
        const errorBody = await readAzureErrorBody(analyzeResponse)
        throwDocumentIntelligenceFromAzureResponse(analyzeResponse.status, errorBody)
      }

      const operationLocation = analyzeResponse.headers.get("operation-location")
      if (!operationLocation) {
        throw new DocumentIntelligenceError(
          "Azure Document Intelligence Operation-Location başlığı eksik."
        )
      }

      let operation: AzureAnalyzeOperation | null = null

      for (let attempt = 0; attempt < this.config.maxPollAttempts; attempt++) {
        if (attempt > 0) {
          await sleep(this.config.pollIntervalMs)
        }

        const pollResponse = await fetch(operationLocation, {
          method: "GET",
          headers: {
            "Ocp-Apim-Subscription-Key": apiKey,
          },
          signal: AbortSignal.timeout(this.config.timeoutMs),
        })

        const pollBody = (await pollResponse.json()) as AzureAnalyzeOperation

        if (!pollResponse.ok) {
          throwFromPollFailure(pollResponse.status, pollBody)
        }

        if (pollBody.status === "succeeded") {
          operation = pollBody
          break
        }

        if (pollBody.status === "failed" || pollBody.status === "canceled") {
          throwFromPollFailure(400, pollBody)
        }
      }

      if (!operation) {
        throw new DocumentIntelligenceError(
          `Belge analizi zaman aşımına uğradı (${this.config.maxPollAttempts} deneme).`
        )
      }

      const parsed = parseAnalyzeResult(operation)
      pageCount = parsed.pageCount
      status = ApiUsageStatus.SUCCESS
      return parsed
    } catch (error) {
      if (error instanceof DocumentIntelligenceError) {
        errorMessage = error.message
        errorLogMetadata = error.logMetadata
        throw error
      }
      if (error instanceof Error && error.name === "TimeoutError") {
        errorMessage = `İstek zaman aşımına uğradı (${this.config.timeoutMs}ms).`
        throw new DocumentIntelligenceError(errorMessage)
      }
      errorMessage =
        error instanceof Error ? error.message : "Azure Document Intelligence isteği başarısız."
      throw new DocumentIntelligenceError(errorMessage)
    } finally {
      const durationMs = Date.now() - started
      await prisma.apiUsageLog
        .create({
          data: {
            provider: "azure-document-intelligence",
            endpoint: "/documentModels/prebuilt-read:analyze",
            model: "prebuilt-read",
            status,
            metadata: {
              purpose: input.purpose,
              fileName: input.fileName,
              durationMs,
              apiVersion: this.config.apiVersion,
              pageCount: pageCount || undefined,
              error: errorMessage,
              ...errorLogMetadata,
            },
          },
        })
        .catch(() => null)
    }
  }
}

export async function testAzureDocumentIntelligenceConnection(
  config: AzureDocumentIntelligenceRuntimeConfig
): Promise<{ ok: true; message: string; latencyMs: number }> {
  const endpoint = resolveEndpoint(config.endpoint)
  const url = `${endpoint}/documentintelligence/documentModels?api-version=${encodeURIComponent(config.apiVersion)}`
  const started = Date.now()

  const apiKey = assertAsciiApiKeyHeaderValue(
    config.apiKey,
    "Document Intelligence API key"
  )

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Ocp-Apim-Subscription-Key": apiKey,
    },
    signal: AbortSignal.timeout(config.timeoutMs),
  })

  if (!response.ok) {
    const body = await readAzureErrorBody(response)
    throwDocumentIntelligenceFromAzureResponse(response.status, body)
  }

  return {
    ok: true,
    message: "Azure Document Intelligence bağlantısı başarılı.",
    latencyMs: Date.now() - started,
  }
}
