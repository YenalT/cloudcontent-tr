import { buildArticleGenerationPrompt } from "@/lib/ai/prompts/build-article-prompt"
import { AzureOpenAiClient } from "@/lib/ai/azure-openai-client"
import { AzureOpenAiError } from "@/lib/ai/errors"
import { resolveAzureOpenAiRuntimeConfig } from "@/lib/data/ai-provider-config"
import type {
  ArticleGenerationInput,
  ArticleGenerationService,
  GeneratedArticle,
} from "@/lib/ai/types"
import { generatedArticleSchema } from "@/lib/validations/article-generation"
import { slugify } from "@/lib/utils/slug"

function parseJsonContent(raw: string): unknown {
  const trimmed = raw.trim()
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const jsonText = fenceMatch ? fenceMatch[1].trim() : trimmed
  return JSON.parse(jsonText)
}

export class AzureOpenAiArticleGenerator implements ArticleGenerationService {
  async generate(input: ArticleGenerationInput): Promise<GeneratedArticle> {
    const config = await resolveAzureOpenAiRuntimeConfig()
    const client = new AzureOpenAiClient(config)
    const userPrompt = buildArticleGenerationPrompt(input)

    try {
      const result = await client.chat({
        purpose: "article_generation",
        responseFormatJson: true,
        messages: [
          {
            role: "system",
            content:
              "You are an expert Turkish technology content writer. Always follow instructions precisely and output valid JSON only.",
          },
          { role: "user", content: userPrompt },
        ],
      })

      const parsed = parseJsonContent(result.content)
      const validated = generatedArticleSchema.safeParse(parsed)
      if (!validated.success) {
        throw new AzureOpenAiError(
          "Azure OpenAI yanıtı beklenen JSON şemasına uymuyor."
        )
      }

      const article = validated.data
      return {
        ...article,
        slug: slugify(article.slug) || slugify(article.title),
        seoTitle: article.seoTitle.slice(0, 60),
        metaDescription: article.metaDescription.slice(0, 160),
      }
    } catch (error) {
      if (error instanceof AzureOpenAiError) throw error
      if (error instanceof SyntaxError) {
        throw new AzureOpenAiError("Azure OpenAI yanıtı geçerli JSON değil.")
      }
      throw error
    }
  }
}
