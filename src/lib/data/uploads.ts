import { prisma } from "@/lib/prisma"
import { documentStatusLabel } from "@/lib/utils/format"

export async function getUploadedDocuments() {
  const rows = await prisma.uploadedDocument.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { articles: true, extractedContents: true } },
    },
  })

  return rows.map((row) => ({
    id: row.id,
    fileName: row.fileName,
    fileType: row.fileType,
    fileUrl: row.fileUrl,
    fileSizeBytes: row.fileSizeBytes,
    storageKey: row.storageKey,
    topic: row.topic,
    status: documentStatusLabel(row.status),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    articleCount: row._count.articles,
    extractedContentCount: row._count.extractedContents,
  }))
}

export type UploadedDocumentListItem = Awaited<ReturnType<typeof getUploadedDocuments>>[number]
