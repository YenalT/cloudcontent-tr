import { buildDocumentPreviewContent } from "@/lib/data/document-source-content"
import { documentStatusLabel } from "@/lib/utils/format"
import { prisma } from "@/lib/prisma"

export async function getArticleGenerationOptions() {
  const [urlSources, documents] = await Promise.all([
    prisma.sourceUrl.findMany({
      where: { isActive: true },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        url: true,
        category: true,
        extractedContents: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { rawContent: true, title: true, metadata: true },
        },
      },
    }),
    prisma.uploadedDocument.findMany({
      where: { status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        topic: true,
        status: true,
        extractedContents: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { rawContent: true, title: true, metadata: true },
        },
      },
    }),
  ])

  return {
    urlSources: urlSources.map((s) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      category: s.category,
      defaultContent:
        s.extractedContents[0]?.rawContent ??
        `Başlık: ${s.title}\nURL: ${s.url}\n\nBu kaynak için henüz ayrıştırılmış içerik yok. Konuya göre makale üretilecektir.`,
    })),
    documents: documents
      .filter((d) => d.status === "COMPLETED")
      .map((d) => {
        const extracted = d.extractedContents[0]
        return {
          id: d.id,
          fileName: d.fileName,
          fileType: d.fileType,
          topic: d.topic,
          defaultContent: buildDocumentPreviewContent({
            fileName: d.fileName,
            topic: d.topic,
            rawContent: extracted?.rawContent ?? null,
            metadata: extracted?.metadata,
            status: documentStatusLabel(d.status),
          }),
        }
      }),
  }
}

export type ArticleGenerationOptions = Awaited<ReturnType<typeof getArticleGenerationOptions>>
