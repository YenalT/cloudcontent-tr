import { buildInstagramImagePrompts } from "@/lib/image-generation/prompts/build-instagram-image-prompts"
import type { InstagramDraftText } from "@/lib/validations/instagram-draft"
import { isImageStylePresetId } from "@/lib/image-generation/prompts/style-presets"

export type ArticleForImagePrompts = {
  title: string
  summary: string | null
  content: string | null
  tags?: string[]
  sourceCategory?: string | null
}

export function applyPremiumImagePrompts(
  text: InstagramDraftText,
  article: ArticleForImagePrompts,
  stylePreset?: string
): InstagramDraftText {
  const preset =
    stylePreset && isImageStylePresetId(stylePreset) ? stylePreset : "cinematic_tech"

  const built = buildInstagramImagePrompts({
    articleTitle: article.title,
    articleSummary: article.summary,
    articleContent: article.content,
    tags: article.tags,
    sourceCategory: article.sourceCategory,
    visualDirection: text.visualDirection,
    stylePreset: preset,
  })

  return {
    ...text,
    visualDirection: built.visualDirection,
    postImagePrompt: built.postImagePrompt,
  }
}
