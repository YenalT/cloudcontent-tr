import { z } from "zod"

export const articleGenerationSchema = z.object({
  sourceType: z.enum(["url", "document"]),
  sourceId: z.string().min(1, "Kaynak seçin"),
  sourceContent: z
    .string()
    .min(50, "Kaynak içeriği en az 50 karakter olmalı")
    .max(100_000, "Kaynak içeriği çok uzun"),
  topic: z
    .string()
    .min(2, "Konu en az 2 karakter olmalı")
    .max(200, "Konu en fazla 200 karakter olabilir"),
  targetLanguage: z.literal("Turkish"),
})

export const generatedArticleSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  summary: z.string().min(1),
  content: z.string().min(1),
  seoTitle: z.string().min(1),
  metaDescription: z.string().min(1),
  tags: z.array(z.string()).min(1),
})

export const saveArticleDraftSchema = generatedArticleSchema.extend({
  sourceType: z.enum(["url", "document"]),
  sourceId: z.string().min(1),
})

export type ArticleGenerationFormInput = z.infer<typeof articleGenerationSchema>
export type SaveArticleDraftInput = z.infer<typeof saveArticleDraftSchema>
