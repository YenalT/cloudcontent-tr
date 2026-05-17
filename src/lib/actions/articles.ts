"use server"

import { revalidatePath } from "next/cache"
import { ArticleSourceType, ArticleStatus, Prisma } from "@prisma/client"

import { getArticleGenerationService } from "@/lib/ai/article-generation-service"
import { AzureOpenAiError, isAiConfigurationError } from "@/lib/ai/errors"
import { resolveDocumentSourceContent } from "@/lib/data/document-source-content"
import type { GeneratedArticle } from "@/lib/ai/types"
import { prisma } from "@/lib/prisma"
import {
  articleGenerationSchema,
  generatedArticleSchema,
  saveArticleDraftSchema,
} from "@/lib/validations/article-generation"
import { countWords, slugify } from "@/lib/utils/slug"

export type ArticleActionResult<T = void> = {
  ok: boolean
  message?: string
  data?: T
  fieldErrors?: Record<string, string[]>
}

function prismaErrorMessage(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "Bu slug zaten kullanılıyor."
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Veritabanına bağlanılamadı."
  }
  return "Beklenmeyen bir hata oluştu."
}

async function ensureUniqueSlug(baseSlug: string) {
  let slug = baseSlug
  let suffix = 1
  while (await prisma.article.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`
  }
  return slug
}

export async function previewDocumentSource(
  documentId: string,
  topic: string
): Promise<ArticleActionResult<{ content: string }>> {
  const resolved = await resolveDocumentSourceContent(documentId, topic)
  if (!resolved.ok) {
    return { ok: false, message: resolved.message }
  }
  return { ok: true, data: { content: resolved.content } }
}

export async function generateArticle(
  input: unknown
): Promise<ArticleActionResult<GeneratedArticle>> {
  const parsed = articleGenerationSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Geçersiz girdi.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    let generationInput = parsed.data

    if (parsed.data.sourceType === "document") {
      const resolved = await resolveDocumentSourceContent(
        parsed.data.sourceId,
        parsed.data.topic
      )
      if (!resolved.ok) {
        return { ok: false, message: resolved.message }
      }
      generationInput = {
        ...parsed.data,
        sourceContent: resolved.content,
      }
    }

    const service = await getArticleGenerationService()
    const generated = await service.generate(generationInput)
    const validated = generatedArticleSchema.safeParse(generated)
    if (!validated.success) {
      return { ok: false, message: "Üretilen içerik doğrulanamadı." }
    }
    return { ok: true, data: validated.data, message: "Makale üretildi." }
  } catch (error) {
    if (isAiConfigurationError(error)) {
      return { ok: false, message: error.message }
    }
    if (error instanceof AzureOpenAiError) {
      return { ok: false, message: error.message }
    }
    return { ok: false, message: prismaErrorMessage(error) }
  }
}

export async function saveArticleDraft(
  input: unknown
): Promise<ArticleActionResult<{ articleId: string; slug: string }>> {
  const parsed = saveArticleDraftSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Kaydedilecek içerik geçersiz.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const {
    sourceType,
    sourceId,
    title,
    slug: rawSlug,
    summary,
    content,
    seoTitle,
    metaDescription,
    tags,
  } = parsed.data

  const slug = await ensureUniqueSlug(slugify(rawSlug) || slugify(title))

  try {
    const article = await prisma.$transaction(async (tx) => {
      const created = await tx.article.create({
        data: {
          title,
          slug,
          summary,
          content,
          seoTitle,
          metaDescription,
          tags,
          sourceType:
            sourceType === "url" ? ArticleSourceType.URL : ArticleSourceType.DOCUMENT,
          sourceUrlId: sourceType === "url" ? sourceId : null,
          uploadedDocumentId: sourceType === "document" ? sourceId : null,
          status: ArticleStatus.DRAFT,
        },
      })

      await tx.articleRevision.create({
        data: {
          articleId: created.id,
          revisionNumber: 1,
          title,
          summary,
          content,
          seoTitle,
          metaDescription,
          tags,
        },
      })

      await tx.jobLog.create({
        data: {
          type: "article_generate",
          status: "SUCCESS",
          message: `Makale taslağı kaydedildi: ${title} (${countWords(content)} kelime)`,
          duration: "mock",
        },
      })

      return created
    })

    revalidatePath("/articles")
    revalidatePath("/articles/new")
    revalidatePath("/dashboard")

    return {
      ok: true,
      message: "Makale taslak olarak kaydedildi.",
      data: { articleId: article.id, slug: article.slug },
    }
  } catch (error) {
    return { ok: false, message: prismaErrorMessage(error) }
  }
}
