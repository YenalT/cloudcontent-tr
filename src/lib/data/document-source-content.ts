import { UploadedDocumentStatus } from "@prisma/client"

import { prepareDocumentSourceText } from "@/lib/document-intelligence/topic-section-selector"
import { prisma } from "@/lib/prisma"

export async function resolveDocumentSourceContent(
  documentId: string,
  topic: string
): Promise<{ ok: true; content: string } | { ok: false; message: string }> {
  const document = await prisma.uploadedDocument.findUnique({
    where: { id: documentId },
    include: {
      extractedContents: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })

  if (!document) {
    return { ok: false, message: "Belge bulunamadı." }
  }

  if (document.status === UploadedDocumentStatus.PROCESSING) {
    return {
      ok: false,
      message: "Belge hâlâ işleniyor. Metin çıkarımı tamamlanana kadar bekleyin.",
    }
  }

  if (document.status === UploadedDocumentStatus.FAILED) {
    return {
      ok: false,
      message:
        "Belge metin çıkarımı başarısız oldu. Ayarlar → Azure Document Intelligence yapılandırmasını kontrol edin veya dosyayı yeniden yükleyin.",
    }
  }

  const extracted = document.extractedContents[0]
  if (!extracted?.rawContent?.trim()) {
    return {
      ok: false,
      message: "Bu belge için çıkarılmış metin bulunamadı.",
    }
  }

  const effectiveTopic = topic.trim() || document.topic?.trim() || null
  const content = prepareDocumentSourceText(
    extracted.rawContent,
    extracted.metadata,
    effectiveTopic
  )

  if (content.length < 50) {
    return {
      ok: false,
      message:
        effectiveTopic
          ? "Konuya uygun yeterli içerik bulunamadı. Konuyu genişletin veya farklı bir belge seçin."
          : "Çıkarılan metin makale üretimi için çok kısa.",
    }
  }

  return { ok: true, content }
}

export function buildDocumentPreviewContent(params: {
  fileName: string
  topic: string | null
  rawContent: string | null
  metadata: unknown
  status: string
}): string {
  if (!params.rawContent?.trim()) {
    if (params.status === "processing") {
      return `Dosya: ${params.fileName}\n\nBelge metin çıkarımı devam ediyor…`
    }
    if (params.status === "failed") {
      return `Dosya: ${params.fileName}\n\nMetin çıkarımı başarısız. Ayarlar sayfasından Azure Document Intelligence yapılandırmasını kontrol edin.`
    }
    return `Dosya: ${params.fileName}\nKonu: ${params.topic ?? "Belirtilmedi"}\n\nBelge içeriği henüz ayrıştırılmadı.`
  }

  const previewTopic = params.topic?.trim() || null
  const filtered = prepareDocumentSourceText(
    params.rawContent,
    params.metadata,
    previewTopic
  )

  const header = `Dosya: ${params.fileName}${previewTopic ? `\nKonu: ${previewTopic}` : ""}`
  if (previewTopic && filtered.length > 0) {
    return `${header}\n\n(Konuya göre seçilmiş bölümler)\n\n${filtered}`
  }
  return `${header}\n\n${filtered}`
}
