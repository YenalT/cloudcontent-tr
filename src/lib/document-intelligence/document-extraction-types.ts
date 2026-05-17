export type DocumentExtractionInput = {
  buffer: Buffer
  mimeType: string
  fileName: string
  topic?: string | null
}

import type { Prisma } from "@prisma/client"

export type DocumentExtractionResult = {
  rawContent: string
  title: string | null
  metadata: Prisma.InputJsonValue
}

export interface DocumentExtractionService {
  extract(input: DocumentExtractionInput): Promise<DocumentExtractionResult>
}
