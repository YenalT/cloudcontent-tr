import { DocumentExtractionProvider } from "@prisma/client"

import { AiConfigurationError } from "@/lib/ai/errors"
import { AzureDocumentIntelligenceClient } from "@/lib/document-intelligence/azure-document-intelligence-client"
import type {
  DocumentExtractionInput,
  DocumentExtractionResult,
  DocumentExtractionService,
} from "@/lib/document-intelligence/document-extraction-types"
import { MockDocumentExtractionService } from "@/lib/document-intelligence/mock-document-extractor"
import {
  getActiveDocumentExtractionProvider,
  resolveAzureDocumentIntelligenceRuntimeConfig,
} from "@/lib/data/document-extraction-config"

export type {
  DocumentExtractionInput,
  DocumentExtractionResult,
  DocumentExtractionService,
} from "@/lib/document-intelligence/document-extraction-types"

class AzureDocumentExtractionService implements DocumentExtractionService {
  async extract(input: DocumentExtractionInput): Promise<DocumentExtractionResult> {
    const config = await resolveAzureDocumentIntelligenceRuntimeConfig()
    const client = new AzureDocumentIntelligenceClient(config)
    const result = await client.analyzeDocument({
      buffer: input.buffer,
      mimeType: input.mimeType,
      fileName: input.fileName,
      purpose: "document_upload",
    })

    return {
      rawContent: result.rawContent,
      title: input.fileName,
      metadata: {
        provider: "azure-document-intelligence",
        fileName: input.fileName,
        mimeType: input.mimeType,
        topic: input.topic ?? null,
        modelId: result.modelId,
        pageCount: result.pageCount,
        paragraphs: result.paragraphs,
      },
    }
  }
}

let cached: DocumentExtractionService | null = null
let cachedProvider: DocumentExtractionProvider | null = null

export function clearDocumentExtractionServiceCache() {
  cached = null
  cachedProvider = null
}

export async function getDocumentExtractionService(): Promise<DocumentExtractionService> {
  const active = await getActiveDocumentExtractionProvider()

  if (!active) {
    throw new AiConfigurationError(
      "Aktif belge çıkarım sağlayıcısı yok. Ayarlar → Azure Document Intelligence bölümünden etkinleştirin."
    )
  }

  if (cached && cachedProvider === active) {
    return cached
  }

  if (active === DocumentExtractionProvider.AZURE_DOCUMENT_INTELLIGENCE) {
    cached = new AzureDocumentExtractionService()
    cachedProvider = active
    return cached
  }

  if (active === DocumentExtractionProvider.MOCK) {
    cached = new MockDocumentExtractionService()
    cachedProvider = active
    return cached
  }

  throw new AiConfigurationError(`Desteklenmeyen belge çıkarım sağlayıcısı: ${active}`)
}
