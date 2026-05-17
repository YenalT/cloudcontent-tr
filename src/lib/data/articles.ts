import { prisma } from "@/lib/prisma"

export async function getArticles() {
  const rows = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      sourceUrl: { select: { title: true } },
      uploadedDocument: { select: { fileName: true } },
    },
  })

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status.toLowerCase(),
    wordCount: row.content ? row.content.split(/\s+/).filter(Boolean).length : 0,
    sourceLabel:
      row.sourceUrl?.title ?? row.uploadedDocument?.fileName ?? row.sourceType,
    createdAt: row.createdAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
  }))
}

export type ArticleListItem = Awaited<ReturnType<typeof getArticles>>[number]
