import type { ImageStylePresetId } from "@/lib/image-generation/prompts/style-presets"
import { isImageStylePresetId } from "@/lib/image-generation/prompts/style-presets"
import { extractArticleKeyPoints } from "@/lib/image-generation/prompts/extract-article-key-points"
import {
  buildImagePromptTopicContext,
  type ImagePromptTopicContext,
} from "@/lib/image-generation/prompts/topic-context"
import { buildEducationalPostImagePrompt } from "@/lib/image-generation/prompts/templates"

export type BuildInstagramImagePromptsInput = {
  articleTitle: string
  articleSummary?: string | null
  articleContent?: string | null
  tags?: string[]
  sourceCategory?: string | null
  audience?: string
  visualDirection: string
  stylePreset?: string
}

export type BuiltInstagramImagePrompts = {
  visualDirection: string
  postImagePrompt: string
  topicContext: ImagePromptTopicContext
  stylePreset: ImageStylePresetId
  headlineTurkish: string
  keyPointsTurkish: string[]
}

function resolvePreset(id?: string): ImageStylePresetId {
  if (id && isImageStylePresetId(id)) return id
  return "cinematic_tech"
}

function enhanceVisualDirection(
  topic: ImagePromptTopicContext,
  presetId: ImageStylePresetId,
  existing: string
): string {
  return [
    existing.trim(),
    `Educational Instagram post cover for ${topic.audience}.`,
    `Single square post explaining: ${topic.topic}.`,
    "Readable Turkish typography, azure-blue tech palette, no logos.",
  ]
    .filter(Boolean)
    .join(" ")
}

export function buildInstagramImagePrompts(
  input: BuildInstagramImagePromptsInput
): BuiltInstagramImagePrompts {
  const stylePreset = resolvePreset(input.stylePreset)
  const topicContext = buildImagePromptTopicContext({
    title: input.articleTitle,
    summary: input.articleSummary,
    content: input.articleContent,
    tags: input.tags,
    sourceCategory: input.sourceCategory,
    audience: input.audience,
  })

  const keyPointsTurkish = extractArticleKeyPoints({
    title: input.articleTitle,
    summary: input.articleSummary,
    content: input.articleContent,
  })

  const headlineTurkish = input.articleTitle.slice(0, 72)

  const visualDirection = enhanceVisualDirection(
    topicContext,
    stylePreset,
    input.visualDirection
  )

  const postImagePrompt = buildEducationalPostImagePrompt({
    topic: topicContext,
    stylePresetId: stylePreset,
    visualDirection,
    headlineTurkish,
    keyPointsTurkish,
  })

  return {
    visualDirection,
    stylePreset,
    topicContext,
    headlineTurkish,
    keyPointsTurkish,
    postImagePrompt,
  }
}
