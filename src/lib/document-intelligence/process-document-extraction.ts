import { JobStatus, Prisma, UploadedDocumentStatus } from "@prisma/client"

import {
  AiConfigurationError,
  DocumentIntelligenceError,
  isAiConfigurationError,
} from "@/lib/ai/errors"
import { getDocumentExtractionService } from "@/lib/document-intelligence/document-extraction-service"
import { prisma } from "@/lib/prisma"

export type ProcessDocumentExtractionInput = {
  documentId: string
  buffer: Buffer
  mimeType: string
  fileName: string
  topic?: string | null
}

function formatDuration(ms: number) {
  return `${ms}ms`
}

async function writeJobLog(params: {
  status: JobStatus
  message: string
  duration?: string
  metadata?: Prisma.InputJsonValue
}) {
  await prisma.jobLog
    .create({
      data: {
        type: "document_extract",
        status: params.status,
        message: params.message,
        duration: params.duration,
        metadata: params.metadata,
      },
    })
    .catch(() => null)
}

export async function processDocumentExtraction(
  input: ProcessDocumentExtractionInput
): Promise<{ ok: true } | { ok: false; message: string }> {
  const started = Date.now()
  const metadata = {
    documentId: input.documentId,
    fileName: input.fileName,
    mimeType: input.mimeType,
  }

  await writeJobLog({
    status: JobStatus.RUNNING,
    message: `Belge metin çıkarımı başladı: ${input.fileName}`,
    metadata,
  })

  try {
    const service = await getDocumentExtractionService()
    const extracted = await service.extract({
      buffer: input.buffer,
      mimeType: input.mimeType,
      fileName: input.fileName,
      topic: input.topic,
    })

    await prisma.$transaction(async (tx) => {
      await tx.extractedContent.deleteMany({
        where: { uploadedDocumentId: input.documentId },
      })

      await tx.extractedContent.create({
        data: {
          uploadedDocumentId: input.documentId,
          title: extracted.title ?? input.fileName,
          rawContent: extracted.rawContent,
          metadata: extracted.metadata,
        },
      })

      await tx.uploadedDocument.update({
        where: { id: input.documentId },
        data: { status: UploadedDocumentStatus.COMPLETED },
      })
    })

    const duration = Date.now() - started
    await writeJobLog({
      status: JobStatus.SUCCESS,
      message: `Belge metin çıkarımı tamamlandı: ${input.fileName} (${extracted.rawContent.length} karakter)`,
      duration: formatDuration(duration),
      metadata: {
        ...metadata,
        characterCount: extracted.rawContent.length,
      },
    })

    return { ok: true }
  } catch (error) {
    const duration = Date.now() - started
    let message = "Belge metin çıkarımı başarısız."
    let azureLogFields: Record<string, unknown> = {}

    if (isAiConfigurationError(error)) {
      message = error.message
    } else if (error instanceof DocumentIntelligenceError) {
      message = error.message
      azureLogFields = {
        ...(error.statusCode != null ? { httpStatus: error.statusCode } : {}),
        ...(error.azureErrorCode ? { azureErrorCode: error.azureErrorCode } : {}),
        ...(error.azureInnerCode ? { azureInnerCode: error.azureInnerCode } : {}),
        ...(error.azureInnerMessage ? { azureInnerMessage: error.azureInnerMessage } : {}),
        ...(error.logMetadata ?? {}),
      }
    } else if (error instanceof Error) {
      message = error.message
    }

    await prisma.uploadedDocument
      .update({
        where: { id: input.documentId },
        data: { status: UploadedDocumentStatus.FAILED },
      })
      .catch(() => null)

    await writeJobLog({
      status: JobStatus.FAILED,
      message: `${input.fileName}: ${message}`,
      duration: formatDuration(duration),
      metadata: {
        ...metadata,
        error: message,
        ...azureLogFields,
      },
    })

    return { ok: false, message }
  }
}

export function documentExtractionConfigErrorMessage(error: unknown): string | null {
  if (error instanceof AiConfigurationError) return error.message
  return null
}
