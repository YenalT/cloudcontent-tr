import { prisma } from "@/lib/prisma"

export async function getSourceUrls() {
  const rows = await prisma.sourceUrl.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { articles: true } },
    },
  })

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    category: row.category,
    isActive: row.isActive,
    lastFetchedAt: row.lastFetchedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    articleCount: row._count.articles,
  }))
}

export type SourceUrlListItem = Awaited<ReturnType<typeof getSourceUrls>>[number]
