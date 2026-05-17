"use server"

import { revalidatePath } from "next/cache"
import { JobStatus, Prisma, SocialPlatform, SocialPostStatus } from "@prisma/client"

import { generateInstagramDraftText } from "@/lib/ai/instagram-draft-generator"
import { applyPremiumImagePrompts } from "@/lib/instagram/apply-image-prompts"
import { instagramImagePromptsSchema } from "@/lib/validations/instagram-image-prompts"
import {
  instagramTaggedUsersSchema,
  type InstagramDraftText,
} from "@/lib/validations/instagram-draft"
import {
  AzureOpenAiError,
  isAiConfigurationError,
  isOpenAiImageError,
} from "@/lib/ai/errors"
import { ImageProcessingError } from "@/lib/image-processing/image-processing-errors"
import {
  deleteInstagramVisualAssets,
  generateInstagramPostImage,
} from "@/lib/instagram/instagram-visual-service"
import { prisma } from "@/lib/prisma"

export type InstagramActionState = {
  ok: boolean
  message?: string
  postId?: string
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
        type: "instagram_draft",
        status: params.status,
        message: params.message,
        duration: params.duration,
        metadata: params.metadata,
      },
    })
    .catch(() => null)
}

async function loadArticle(articleId: string) {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      summary: true,
      content: true,
      tags: true,
      sourceUrl: { select: { category: true } },
    },
  })
  if (!article?.content?.trim()) {
    return null
  }
  return {
    id: article.id,
    title: article.title,
    summary: article.summary,
    content: article.content,
    tags: article.tags,
    sourceCategory: article.sourceUrl?.category ?? null,
  }
}

async function upsertDraftShell(articleId: string) {
  return prisma.socialPost.upsert({
    where: {
      articleId_platform: { articleId, platform: SocialPlatform.INSTAGRAM },
    },
    create: {
      articleId,
      platform: SocialPlatform.INSTAGRAM,
      caption: "",
      status: SocialPostStatus.DRAFT,
    },
    update: {},
  })
}

function emptyLegacyVisualFields() {
  return {
    storyText: null,
    carouselSlides: [],
    storyImagePrompt: null,
    carouselImagePrompts: [],
    storyImageUrl: null,
    carouselImageUrls: [],
    storyImageStorageKey: null,
    carouselImageStorageKeys: [],
  }
}

export async function generateInstagramDraft(
  articleId: string
): Promise<InstagramActionState> {
  const started = Date.now()
  const article = await loadArticle(articleId)
  if (!article) {
    return { ok: false, message: "Makale bulunamadı veya içerik boş." }
  }

  await writeJobLog({
    status: JobStatus.RUNNING,
    message: `Instagram gönderi taslağı üretiliyor: ${article.title}`,
    metadata: { articleId },
  })

  try {
    const shell = await upsertDraftShell(articleId)
    await deleteInstagramVisualAssets(shell.id)

    const text = await generateInstagramDraftText(article)
    const visuals = await generateInstagramPostImage({
      postId: shell.id,
      articleTitle: article.title,
      draft: text,
    })

    const post = await prisma.socialPost.update({
      where: { id: shell.id },
      data: {
        caption: text.caption,
        hashtags: text.hashtags,
        visualDirection: text.visualDirection,
        postImagePrompt: text.postImagePrompt,
        postImageUrl: visuals.postImageUrl,
        postImageStorageKey: visuals.postImageStorageKey,
        imageStylePreset: "cinematic_tech",
        status: SocialPostStatus.PENDING_REVIEW,
        approvedAt: null,
        rejectedAt: null,
        ...emptyLegacyVisualFields(),
      },
    })

    await writeJobLog({
      status: JobStatus.SUCCESS,
      message: `Instagram gönderi taslağı oluşturuldu: ${article.title}`,
      duration: `${Date.now() - started}ms`,
      metadata: { articleId, postId: post.id },
    })

    revalidatePath("/instagram")
    return { ok: true, message: "Instagram gönderi taslağı oluşturuldu.", postId: post.id }
  } catch (error) {
    const message = formatInstagramError(error, "Instagram gönderi taslağı oluşturulamadı.")

    await writeJobLog({
      status: JobStatus.FAILED,
      message: `${article.title}: ${message}`,
      duration: `${Date.now() - started}ms`,
      metadata: { articleId, error: message },
    })

    return { ok: false, message }
  }
}

function formatInstagramError(error: unknown, fallback: string): string {
  if (isAiConfigurationError(error)) return error.message
  if (isOpenAiImageError(error)) return error.message
  if (error instanceof ImageProcessingError) return error.message
  if (error instanceof AzureOpenAiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export async function regenerateInstagramCaption(
  articleId: string
): Promise<InstagramActionState> {
  const article = await loadArticle(articleId)
  if (!article) {
    return { ok: false, message: "Makale bulunamadı veya içerik boş." }
  }

  const existing = await prisma.socialPost.findUnique({
    where: {
      articleId_platform: { articleId, platform: SocialPlatform.INSTAGRAM },
    },
  })
  if (!existing) {
    return { ok: false, message: "Önce Instagram gönderi taslağı oluşturun." }
  }

  try {
    const text = await generateInstagramDraftText(article)
    await prisma.socialPost.update({
      where: { id: existing.id },
      data: {
        caption: text.caption,
        hashtags: text.hashtags,
        visualDirection: text.visualDirection,
        postImagePrompt: text.postImagePrompt,
        imageStylePreset: existing.imageStylePreset,
        status: SocialPostStatus.PENDING_REVIEW,
        approvedAt: null,
        rejectedAt: null,
      },
    })

    revalidatePath("/instagram")
    return { ok: true, message: "Caption ve hashtagler yeniden üretildi.", postId: existing.id }
  } catch (error) {
    return { ok: false, message: formatInstagramError(error, "Caption yeniden üretilemedi.") }
  }
}

/** @deprecated Use regenerateInstagramCaption */
export const regenerateInstagramText = regenerateInstagramCaption

export async function regenerateInstagramPostImage(
  articleId: string
): Promise<InstagramActionState> {
  const existing = await prisma.socialPost.findUnique({
    where: {
      articleId_platform: { articleId, platform: SocialPlatform.INSTAGRAM },
    },
    include: { article: { select: { title: true } } },
  })

  if (!existing) {
    return { ok: false, message: "Önce Instagram gönderi taslağı oluşturun." }
  }

  if (!existing.postImagePrompt) {
    return { ok: false, message: "Görsel promptu eksik. Önce caption üretin." }
  }

  try {
    await deleteInstagramVisualAssets(existing.id)

    const visuals = await generateInstagramPostImage({
      postId: existing.id,
      articleTitle: existing.article.title,
      draft: { postImagePrompt: existing.postImagePrompt },
    })

    await prisma.socialPost.update({
      where: { id: existing.id },
      data: {
        postImageUrl: visuals.postImageUrl,
        postImageStorageKey: visuals.postImageStorageKey,
        status: SocialPostStatus.PENDING_REVIEW,
        approvedAt: null,
        rejectedAt: null,
        ...emptyLegacyVisualFields(),
      },
    })

    revalidatePath("/instagram")
    return { ok: true, message: "Gönderi görseli yeniden üretildi.", postId: existing.id }
  } catch (error) {
    return { ok: false, message: formatInstagramError(error, "Görsel yeniden üretilemedi.") }
  }
}

/** @deprecated Use regenerateInstagramPostImage */
export const regenerateInstagramVisuals = regenerateInstagramPostImage

export async function saveInstagramTaggedUsers(
  postId: string,
  input: unknown
): Promise<InstagramActionState> {
  const parsed = instagramTaggedUsersSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: "Etiketlenecek kullanıcılar geçersiz." }
  }

  const post = await prisma.socialPost.findUnique({ where: { id: postId } })
  if (!post) {
    return { ok: false, message: "Taslak bulunamadı." }
  }

  await prisma.socialPost.update({
    where: { id: postId },
    data: { taggedUsers: parsed.data.taggedUsers },
  })

  revalidatePath("/instagram")
  return { ok: true, message: "Etiketlenecek kullanıcılar kaydedildi.", postId }
}

export async function approveInstagramDraft(postId: string): Promise<InstagramActionState> {
  const post = await prisma.socialPost.findUnique({ where: { id: postId } })
  if (!post) return { ok: false, message: "Taslak bulunamadı." }

  if (post.status === SocialPostStatus.PUBLISHED) {
    return { ok: false, message: "Yayınlanmış gönderi onaylanamaz." }
  }

  await prisma.socialPost.update({
    where: { id: postId },
    data: {
      status: SocialPostStatus.APPROVED,
      approvedAt: new Date(),
      rejectedAt: null,
    },
  })

  await writeJobLog({
    status: JobStatus.SUCCESS,
    message: `Instagram gönderi taslağı onaylandı: ${postId}`,
    metadata: { postId, articleId: post.articleId },
  })

  revalidatePath("/instagram")
  return {
    ok: true,
    message: "Taslak onaylandı. Zapier’e göndermek için «Zapier’e Gönder» düğmesini kullanın.",
  }
}

export async function rejectInstagramDraft(postId: string): Promise<InstagramActionState> {
  const post = await prisma.socialPost.findUnique({ where: { id: postId } })
  if (!post) return { ok: false, message: "Taslak bulunamadı." }

  await prisma.socialPost.update({
    where: { id: postId },
    data: {
      status: SocialPostStatus.REJECTED,
      rejectedAt: new Date(),
      approvedAt: null,
    },
  })

  revalidatePath("/instagram")
  return { ok: true, message: "Taslak reddedildi." }
}

export async function regenerateInstagramImagePrompts(
  articleId: string,
  stylePreset?: string
): Promise<InstagramActionState> {
  const article = await loadArticle(articleId)
  if (!article) {
    return { ok: false, message: "Makale bulunamadı veya içerik boş." }
  }

  const post = await prisma.socialPost.findUnique({
    where: {
      articleId_platform: { articleId, platform: SocialPlatform.INSTAGRAM },
    },
  })
  if (!post) {
    return { ok: false, message: "Önce Instagram gönderi taslağı oluşturun." }
  }

  const built = applyPremiumImagePrompts(
    {
      caption: post.caption,
      hashtags: post.hashtags,
      visualDirection: post.visualDirection ?? "Educational Instagram post cover",
      postImagePrompt: post.postImagePrompt ?? "",
    },
    article,
    stylePreset ?? post.imageStylePreset
  )

  await prisma.socialPost.update({
    where: { id: post.id },
    data: {
      visualDirection: built.visualDirection,
      postImagePrompt: built.postImagePrompt,
      imageStylePreset: stylePreset ?? post.imageStylePreset,
    },
  })

  revalidatePath("/instagram")
  return { ok: true, message: "Görsel promptu yeniden oluşturuldu.", postId: post.id }
}

export async function saveInstagramImagePrompts(
  postId: string,
  input: unknown
): Promise<InstagramActionState> {
  const parsed = instagramImagePromptsSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: "Prompt alanları geçersiz." }
  }

  const post = await prisma.socialPost.findUnique({ where: { id: postId } })
  if (!post) {
    return { ok: false, message: "Taslak bulunamadı." }
  }

  await prisma.socialPost.update({
    where: { id: postId },
    data: parsed.data,
  })

  revalidatePath("/instagram")
  return { ok: true, message: "Görsel promptu kaydedildi.", postId }
}
