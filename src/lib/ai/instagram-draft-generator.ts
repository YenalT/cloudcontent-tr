import { AiProvider } from "@prisma/client"

import { buildInstagramDraftPrompt } from "@/lib/ai/prompts/build-instagram-draft-prompt"
import { AzureOpenAiClient } from "@/lib/ai/azure-openai-client"
import { AiConfigurationError, AzureOpenAiError } from "@/lib/ai/errors"
import { getActiveProvider, resolveAzureOpenAiRuntimeConfig } from "@/lib/data/ai-provider-config"
import { applyPremiumImagePrompts } from "@/lib/instagram/apply-image-prompts"
import {
  instagramDraftTextSchema,
  type InstagramDraftText,
} from "@/lib/validations/instagram-draft"

export type ArticleForInstagram = {
  id: string
  title: string
  summary: string | null
  content: string | null
  tags?: string[]
  sourceCategory?: string | null
}

function parseJsonContent(raw: string): unknown {
  const trimmed = raw.trim()
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const jsonText = fenceMatch ? fenceMatch[1].trim() : trimmed
  return JSON.parse(jsonText)
}

async function generateWithAzure(article: ArticleForInstagram): Promise<InstagramDraftText> {
  const config = await resolveAzureOpenAiRuntimeConfig()
  const client = new AzureOpenAiClient(config)
  const userPrompt = buildInstagramDraftPrompt({
    articleTitle: article.title,
    articleSummary: article.summary ?? "",
    articleContent: article.content ?? "",
  })

  const result = await client.chat({
    purpose: "instagram_draft_generation",
    responseFormatJson: true,
    messages: [
      {
        role: "system",
        content:
          "You are an expert Turkish Instagram content strategist. Output valid JSON only for a SINGLE feed post (no story, no carousel).",
      },
      { role: "user", content: userPrompt },
    ],
  })

  const parsed = parseJsonContent(result.content)
  const validated = instagramDraftTextSchema.safeParse(parsed)
  if (!validated.success) {
    throw new AzureOpenAiError("Instagram taslak yanıtı beklenen JSON şemasına uymuyor.")
  }
  return applyPremiumImagePrompts(validated.data, article)
}

async function generateWithMock(article: ArticleForInstagram): Promise<InstagramDraftText> {
  await new Promise((r) => setTimeout(r, 600))

  const topic = article.title
  const base: InstagramDraftText = {
    caption: `${topic}\n\n${article.summary ?? "Yeni içerik yayında."}\n\nDetaylar için bio linkimizi ziyaret edin.`,
    hashtags: [
      "bulut",
      "teknoloji",
      "dijitaldonusum",
      "kurumsal",
      "ict",
      "yazilim",
      "devops",
      "cloudcontent",
    ],
    visualDirection:
      "Educational square Instagram post cover with Turkish headline and bullet points, azure tech palette.",
    postImagePrompt: "placeholder",
  }

  return applyPremiumImagePrompts(base, article)
}

export async function generateInstagramDraftText(
  article: ArticleForInstagram
): Promise<InstagramDraftText> {
  const active = await getActiveProvider()

  if (active === AiProvider.AZURE_OPENAI) {
    try {
      return await generateWithAzure(article)
    } catch (error) {
      if (error instanceof AzureOpenAiError) throw error
      if (error instanceof SyntaxError) {
        throw new AzureOpenAiError("Instagram taslak yanıtı geçerli JSON değil.")
      }
      throw error
    }
  }

  if (active === AiProvider.MOCK) {
    return generateWithMock(article)
  }

  throw new AiConfigurationError(
    "Aktif AI sağlayıcısı yok. Ayarlar → Azure OpenAI bölümünden yapılandırın."
  )
}
