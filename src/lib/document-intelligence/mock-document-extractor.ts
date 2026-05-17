import type {
  DocumentExtractionInput,
  DocumentExtractionResult,
  DocumentExtractionService,
} from "@/lib/document-intelligence/document-extraction-types"

export class MockDocumentExtractionService implements DocumentExtractionService {
  async extract(input: DocumentExtractionInput): Promise<DocumentExtractionResult> {
    const topicLine = input.topic ? `Konu: ${input.topic}\n\n` : ""
    const rawContent = `${topicLine}Dosya: ${input.fileName}\nTür: ${input.mimeType}\n\nBu içerik geliştirme modunda (Mock) üretilmiştir. Azure Document Intelligence yapılandırıldığında gerçek metin çıkarımı yapılır.\n\nÖrnek paragraf: Bulut bilişim, ölçeklenebilir altyapı ve yapay zeka hizmetlerini bir araya getirir.\n\nÖrnek paragraf: Kurumsal içerik üretiminde kaynak belgelerin doğru ayrıştırılması kritik öneme sahiptir.`

    return {
      rawContent,
      title: input.fileName,
      metadata: {
        provider: "mock",
        fileName: input.fileName,
        mimeType: input.mimeType,
        paragraphs: rawContent
          .split(/\n{2,}/)
          .filter((p) => p.trim().length > 0)
          .map((content, index) => ({ content: content.trim(), pageNumber: index + 1 })),
        pageCount: 1,
        modelId: "mock",
      },
    }
  }
}
