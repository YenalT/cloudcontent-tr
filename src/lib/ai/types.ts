export type ArticleSourceTypeInput = "url" | "document"

export type ArticleGenerationInput = {
  sourceType: ArticleSourceTypeInput
  sourceId: string
  sourceContent: string
  topic: string
  targetLanguage: string
}

export type GeneratedArticle = {
  title: string
  slug: string
  summary: string
  content: string
  seoTitle: string
  metaDescription: string
  tags: string[]
}

export interface ArticleGenerationService {
  generate(input: ArticleGenerationInput): Promise<GeneratedArticle>
}
