import {
  ArticleSourceType,
  ArticleStatus,
  SocialPlatform,
  SocialPostStatus,
  type Prisma,
} from "@prisma/client"

import {
  DASHBOARD_SEGMENT_ORDER,
  type DashboardSegmentKey,
  SEGMENT_META,
  segmentFromArticleStatus,
  segmentFromSocialStatus,
} from "@/lib/dashboard/status-mapping"
import {
  parseDashboardFilters,
  resolveDateRange,
  type DashboardFilters,
} from "@/lib/dashboard/filters"
import { prisma } from "@/lib/prisma"

export type DashboardStats = {
  totalArticles: number
  publishedArticles: number
  approvedArticles: number
  rejectedArticles: number
  failedArticles: number
  draftArticles: number
  instagramGenerated: number
  instagramSentToZapier: number
  instagramPublished: number
  instagramFailed: number
  instagramRejected: number
  pendingApproval: number
}

export type StatusDistributionItem = {
  key: DashboardSegmentKey
  label: string
  color: string
  count: number
}

export type TimelinePoint = {
  date: string
  generated: number
  published: number
}

export type InstagramDeliveryPoint = {
  date: string
  success: number
  failure: number
}

export type RadialMetrics = {
  approvalRate: number
  publishingSuccessRate: number
  approvalLabel: string
  publishingLabel: string
}

export type DashboardRecord = {
  id: string
  recordType: "article" | "instagram"
  title: string
  status: string
  source: string
  sourceType: "url" | "document" | "manual" | null
  updatedAt: string
  publishedAt: string | null
  errorMessage: string | null
  failedStep: string | null
  lastRetryAt: string | null
  retryCount: number | null
  suggestedAction: string | null
  zapierDeliveryStatus: string | null
  articleId: string
  articleSlug: string | null
}

function articleDateWhere(range: { from: Date; to: Date }): Prisma.ArticleWhereInput {
  return { updatedAt: { gte: range.from, lte: range.to } }
}

function socialDateWhere(range: { from: Date; to: Date }): Prisma.SocialPostWhereInput {
  return {
    platform: SocialPlatform.INSTAGRAM,
    updatedAt: { gte: range.from, lte: range.to },
  }
}

function articleSourceWhere(
  sourceType: DashboardFilters["sourceType"]
): Prisma.ArticleWhereInput {
  if (sourceType === "all") return {}
  if (sourceType === "url") return { sourceType: ArticleSourceType.URL }
  if (sourceType === "document") return { sourceType: ArticleSourceType.DOCUMENT }
  return { sourceUrlId: null, uploadedDocumentId: null }
}

function mergeArticleWhere(
  range: { from: Date; to: Date },
  filters: DashboardFilters,
  extra?: Prisma.ArticleWhereInput
): Prisma.ArticleWhereInput {
  return {
    ...articleDateWhere(range),
    ...articleSourceWhere(filters.sourceType),
    ...extra,
  }
}

function mergeSocialWhere(
  range: { from: Date; to: Date },
  extra?: Prisma.SocialPostWhereInput
): Prisma.SocialPostWhereInput {
  return { ...socialDateWhere(range), ...extra }
}

export async function getDashboardStats(
  rawFilters?: Partial<DashboardFilters>
): Promise<DashboardStats> {
  const filters = parseDashboardFilters(rawFilters)
  const range = resolveDateRange(filters)
  const articleWhere = mergeArticleWhere(range, filters)
  const socialWhere = mergeSocialWhere(range)

  const [
    totalArticles,
    publishedArticles,
    failedArticles,
    draftArticles,
    pendingArticleReview,
    instagramGenerated,
    approvedPosts,
    rejectedPosts,
    instagramSentToZapier,
    instagramPublished,
    instagramFailed,
    pendingSocialReview,
  ] = await Promise.all([
    prisma.article.count({ where: articleWhere }),
    prisma.article.count({
      where: mergeArticleWhere(range, filters, { status: ArticleStatus.PUBLISHED }),
    }),
    prisma.article.count({
      where: mergeArticleWhere(range, filters, { status: ArticleStatus.FAILED }),
    }),
    prisma.article.count({
      where: mergeArticleWhere(range, filters, {
        status: { in: [ArticleStatus.DRAFT, ArticleStatus.GENERATED] },
      }),
    }),
    prisma.article.count({
      where: mergeArticleWhere(range, filters, { status: ArticleStatus.PENDING_REVIEW }),
    }),
    prisma.socialPost.count({ where: socialWhere }),
    prisma.socialPost.count({
      where: mergeSocialWhere(range, { status: SocialPostStatus.APPROVED }),
    }),
    prisma.socialPost.count({
      where: mergeSocialWhere(range, { status: SocialPostStatus.REJECTED }),
    }),
    prisma.socialPost.count({
      where: mergeSocialWhere(range, { status: SocialPostStatus.SENT_TO_ZAPIER }),
    }),
    prisma.socialPost.count({
      where: mergeSocialWhere(range, { status: SocialPostStatus.PUBLISHED }),
    }),
    prisma.socialPost.count({
      where: mergeSocialWhere(range, { status: SocialPostStatus.FAILED }),
    }),
    prisma.socialPost.count({
      where: mergeSocialWhere(range, { status: SocialPostStatus.PENDING_REVIEW }),
    }),
  ])

  return {
    totalArticles,
    publishedArticles,
    approvedArticles: approvedPosts,
    rejectedArticles: rejectedPosts,
    failedArticles,
    draftArticles,
    instagramGenerated,
    instagramSentToZapier,
    instagramPublished,
    instagramFailed,
    instagramRejected: rejectedPosts,
    pendingApproval: pendingArticleReview + pendingSocialReview,
  }
}

export async function getStatusDistribution(
  rawFilters?: Partial<DashboardFilters>
): Promise<StatusDistributionItem[]> {
  const filters = parseDashboardFilters(rawFilters)
  const range = resolveDateRange(filters)
  const counts: Record<DashboardSegmentKey, number> = Object.fromEntries(
    DASHBOARD_SEGMENT_ORDER.map((k) => [k, 0])
  ) as Record<DashboardSegmentKey, number>

  const includeArticles =
    filters.contentType === "all" || filters.contentType === "articles"
  const includeInstagram =
    filters.contentType === "all" || filters.contentType === "instagram"

  if (includeArticles) {
    const articles = await prisma.article.findMany({
      where: mergeArticleWhere(range, filters),
      select: { status: true },
    })
    for (const row of articles) {
      const seg = segmentFromArticleStatus(row.status)
      if (seg) counts[seg] += 1
    }
  }

  if (includeInstagram) {
    const posts = await prisma.socialPost.findMany({
      where: mergeSocialWhere(range),
      select: { status: true },
    })
    for (const row of posts) {
      const seg = segmentFromSocialStatus(row.status)
      if (seg) counts[seg] += 1
    }
  }

  return DASHBOARD_SEGMENT_ORDER.map((key) => ({
    key,
    label: SEGMENT_META[key].label,
    color: SEGMENT_META[key].color,
    count: counts[key],
  }))
}

export async function getPublishingTimeline(
  rawFilters?: Partial<DashboardFilters>
): Promise<TimelinePoint[]> {
  const filters = parseDashboardFilters(rawFilters)
  const range = resolveDateRange(filters)

  const articles = await prisma.article.findMany({
    where: mergeArticleWhere(range, filters),
    select: { createdAt: true, publishedAt: true, status: true, updatedAt: true },
  })

  const dayMap = new Map<string, { generated: number; published: number }>()

  function bump(date: Date, field: "generated" | "published") {
    const key = date.toISOString().slice(0, 10)
    const entry = dayMap.get(key) ?? { generated: 0, published: 0 }
    entry[field] += 1
    dayMap.set(key, entry)
  }

  for (const row of articles) {
    bump(row.createdAt, "generated")
    if (row.publishedAt) bump(row.publishedAt, "published")
    else if (row.status === ArticleStatus.PUBLISHED) bump(row.updatedAt ?? row.createdAt, "published")
  }

  const cursor = new Date(range.from)
  cursor.setHours(0, 0, 0, 0)
  const end = new Date(range.to)
  const points: TimelinePoint[] = []

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10)
    const entry = dayMap.get(key) ?? { generated: 0, published: 0 }
    points.push({ date: key, ...entry })
    cursor.setDate(cursor.getDate() + 1)
  }

  return points
}

export async function getInstagramDeliveryStats(
  rawFilters?: Partial<DashboardFilters>
): Promise<InstagramDeliveryPoint[]> {
  const filters = parseDashboardFilters(rawFilters)
  const range = resolveDateRange(filters)

  const logs = await prisma.zapierWebhookLog.findMany({
    where: { sentAt: { gte: range.from, lte: range.to } },
    select: { sentAt: true, success: true },
    orderBy: { sentAt: "asc" },
  })

  const dayMap = new Map<string, { success: number; failure: number }>()

  for (const log of logs) {
    const key = log.sentAt.toISOString().slice(0, 10)
    const entry = dayMap.get(key) ?? { success: 0, failure: 0 }
    if (log.success) entry.success += 1
    else entry.failure += 1
    dayMap.set(key, entry)
  }

  const cursor = new Date(range.from)
  cursor.setHours(0, 0, 0, 0)
  const end = new Date(range.to)
  const points: InstagramDeliveryPoint[] = []

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10)
    const entry = dayMap.get(key) ?? { success: 0, failure: 0 }
    points.push({ date: key, ...entry })
    cursor.setDate(cursor.getDate() + 1)
  }

  return points
}

export async function getRadialMetrics(
  rawFilters?: Partial<DashboardFilters>
): Promise<RadialMetrics> {
  const filters = parseDashboardFilters(rawFilters)
  const range = resolveDateRange(filters)

  const [approved, rejected, pending, published, failed] = await Promise.all([
    prisma.socialPost.count({
      where: mergeSocialWhere(range, { status: SocialPostStatus.APPROVED }),
    }),
    prisma.socialPost.count({
      where: mergeSocialWhere(range, { status: SocialPostStatus.REJECTED }),
    }),
    prisma.socialPost.count({
      where: mergeSocialWhere(range, { status: SocialPostStatus.PENDING_REVIEW }),
    }),
    prisma.socialPost.count({
      where: mergeSocialWhere(range, { status: SocialPostStatus.PUBLISHED }),
    }),
    prisma.socialPost.count({
      where: mergeSocialWhere(range, { status: SocialPostStatus.FAILED }),
    }),
  ])

  const approvalDenom = approved + rejected + pending
  const publishDenom = published + failed

  return {
    approvalRate: approvalDenom > 0 ? Math.round((approved / approvalDenom) * 100) : 0,
    publishingSuccessRate: publishDenom > 0 ? Math.round((published / publishDenom) * 100) : 0,
    approvalLabel: `${approved} / ${approvalDenom} onaylandı`,
    publishingLabel: `${published} / ${publishDenom} yayınlandı`,
  }
}

function segmentArticleWhere(segment: DashboardSegmentKey): Prisma.ArticleWhereInput {
  switch (segment) {
    case "published":
      return { status: ArticleStatus.PUBLISHED }
    case "pending_approval":
      return { status: ArticleStatus.PENDING_REVIEW }
    case "draft":
      return { status: { in: [ArticleStatus.DRAFT, ArticleStatus.GENERATED] } }
    case "failed":
      return { status: ArticleStatus.FAILED }
    default:
      return { id: { in: [] } }
  }
}

function segmentSocialWhere(segment: DashboardSegmentKey): Prisma.SocialPostWhereInput {
  switch (segment) {
    case "approved":
      return { status: SocialPostStatus.APPROVED }
    case "pending_approval":
      return { status: SocialPostStatus.PENDING_REVIEW }
    case "draft":
      return { status: SocialPostStatus.DRAFT }
    case "rejected":
      return { status: SocialPostStatus.REJECTED }
    case "failed":
    case "instagram_failed":
      return { status: SocialPostStatus.FAILED }
    case "sent_to_zapier":
      return { status: SocialPostStatus.SENT_TO_ZAPIER }
    case "instagram_published":
      return { status: SocialPostStatus.PUBLISHED }
    default:
      return { id: { in: [] } }
  }
}

const ARTICLE_SEGMENTS: DashboardSegmentKey[] = [
  "published",
  "pending_approval",
  "draft",
  "failed",
]

const INSTAGRAM_ONLY_SEGMENTS: DashboardSegmentKey[] = [
  "approved",
  "rejected",
  "sent_to_zapier",
  "instagram_published",
  "instagram_failed",
]

const SHARED_SEGMENTS: DashboardSegmentKey[] = ["pending_approval", "draft", "failed"]

function mapArticleSource(row: {
  sourceType: ArticleSourceType
  sourceUrl: { title: string } | null
  uploadedDocument: { fileName: string } | null
  sourceUrlId: string | null
  uploadedDocumentId: string | null
}): { source: string; sourceType: "url" | "document" | "manual" | null } {
  if (row.sourceUrl) return { source: row.sourceUrl.title, sourceType: "url" }
  if (row.uploadedDocument)
    return { source: row.uploadedDocument.fileName, sourceType: "document" }
  if (!row.sourceUrlId && !row.uploadedDocumentId)
    return { source: "Manuel", sourceType: "manual" }
  return {
    source: row.sourceType === ArticleSourceType.URL ? "URL" : "Belge",
    sourceType: row.sourceType === ArticleSourceType.URL ? "url" : "document",
  }
}

export async function getRecordsByStatus(
  segment: DashboardSegmentKey,
  rawFilters?: Partial<DashboardFilters>
): Promise<DashboardRecord[]> {
  const filters = parseDashboardFilters(rawFilters)
  const range = resolveDateRange(filters)
  const records: DashboardRecord[] = []

  const loadArticles =
    (filters.contentType === "all" || filters.contentType === "articles") &&
    (ARTICLE_SEGMENTS.includes(segment) || SHARED_SEGMENTS.includes(segment)) &&
    !INSTAGRAM_ONLY_SEGMENTS.includes(segment)

  const loadInstagram =
    (filters.contentType === "all" || filters.contentType === "instagram") &&
    (INSTAGRAM_ONLY_SEGMENTS.includes(segment) ||
      SHARED_SEGMENTS.includes(segment) ||
      segment === "instagram_failed")

  if (loadArticles) {
    const articles = await prisma.article.findMany({
      where: {
        ...mergeArticleWhere(range, filters),
        ...segmentArticleWhere(segment),
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        sourceUrl: { select: { title: true } },
        uploadedDocument: { select: { fileName: true } },
      },
    })

    for (const row of articles) {
      const { source, sourceType } = mapArticleSource(row)
      records.push({
        id: row.id,
        recordType: "article",
        title: row.title,
        status: row.status.toLowerCase(),
        source,
        sourceType,
        updatedAt: row.updatedAt.toISOString(),
        publishedAt: row.publishedAt?.toISOString() ?? null,
        errorMessage: row.status === ArticleStatus.FAILED ? "Makale üretimi başarısız" : null,
        failedStep: row.status === ArticleStatus.FAILED ? "article_generation" : null,
        lastRetryAt: null,
        retryCount: null,
        suggestedAction: null,
        zapierDeliveryStatus: null,
        articleId: row.id,
        articleSlug: row.slug,
      })
    }
  }

  if (loadInstagram) {
    const socialWhere =
      segment === "failed" || segment === "instagram_failed"
        ? { status: SocialPostStatus.FAILED }
        : segmentSocialWhere(segment)

    const posts = await prisma.socialPost.findMany({
      where: { ...mergeSocialWhere(range), ...socialWhere },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        article: {
          select: {
            id: true,
            title: true,
            slug: true,
            sourceType: true,
            sourceUrlId: true,
            uploadedDocumentId: true,
            sourceUrl: { select: { title: true } },
            uploadedDocument: { select: { fileName: true } },
          },
        },
        zapierWebhookLogs: {
          orderBy: { sentAt: "desc" },
          take: 1,
        },
      },
    })

    for (const row of posts) {
      const latestLog = row.zapierWebhookLogs[0]
      const { source, sourceType } = mapArticleSource(row.article)
      records.push({
        id: row.id,
        recordType: "instagram",
        title: row.article.title,
        status: row.status.toLowerCase(),
        source,
        sourceType,
        updatedAt: row.updatedAt.toISOString(),
        publishedAt: row.publishedAt?.toISOString() ?? null,
        errorMessage: row.publishError ?? latestLog?.errorMessage ?? null,
        failedStep: row.publishError
          ? "instagram_publish"
          : latestLog && !latestLog.success
            ? "zapier_webhook"
            : null,
        lastRetryAt: latestLog?.sentAt.toISOString() ?? null,
        retryCount: latestLog?.retryCount ?? null,
        suggestedAction: latestLog?.suggestedAction ?? null,
        zapierDeliveryStatus: latestLog
          ? latestLog.success
            ? "success"
            : "failed"
          : null,
        articleId: row.articleId,
        articleSlug: row.article.slug,
      })
    }
  }

  records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return records.slice(0, 100)
}

export async function getDashboardReportBundle(rawFilters?: Partial<DashboardFilters>) {
  const filters = parseDashboardFilters(rawFilters)
  const [stats, distribution, timeline, delivery, radial] = await Promise.all([
    getDashboardStats(filters),
    getStatusDistribution(filters),
    getPublishingTimeline(filters),
    getInstagramDeliveryStats(filters),
    getRadialMetrics(filters),
  ])

  return { stats, distribution, timeline, delivery, radial, filters }
}
