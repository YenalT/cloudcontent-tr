import { AiProvider } from "@prisma/client"

import { AzureOpenAiArticleGenerator } from "@/lib/ai/azure-article-generator"
import { AiConfigurationError } from "@/lib/ai/errors"
import { MockArticleGenerationService } from "@/lib/ai/mock-article-generator"
import type { ArticleGenerationService } from "@/lib/ai/types"
import { getActiveProvider } from "@/lib/data/ai-provider-config"

export type { ArticleGenerationInput, GeneratedArticle } from "@/lib/ai/types"
export { buildArticleGenerationPrompt } from "@/lib/ai/prompts/build-article-prompt"

let cached: ArticleGenerationService | null = null
let cachedProvider: AiProvider | null = null

export function clearArticleGenerationServiceCache() {
  cached = null
  cachedProvider = null
}

export async function getArticleGenerationService(): Promise<ArticleGenerationService> {
  const active = await getActiveProvider()

  if (!active) {
    throw new AiConfigurationError(
      "Aktif AI sağlayıcısı yok. Ayarlar → Azure OpenAI bölümünden bir sağlayıcıyı etkinleştirin."
    )
  }

  if (cached && cachedProvider === active) {
    return cached
  }

  if (active === AiProvider.AZURE_OPENAI) {
    cached = new AzureOpenAiArticleGenerator()
    cachedProvider = active
    return cached
  }

  if (active === AiProvider.MOCK) {
    cached = new MockArticleGenerationService()
    cachedProvider = active
    return cached
  }

  throw new AiConfigurationError(`Desteklenmeyen AI sağlayıcısı: ${active}`)
}
