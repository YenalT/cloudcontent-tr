import { buildArticleGenerationPrompt } from "@/lib/ai/prompts/build-article-prompt"
import type {
  ArticleGenerationInput,
  ArticleGenerationService,
  GeneratedArticle,
} from "@/lib/ai/types"
import { slugify } from "@/lib/utils/slug"

/**
 * Mock AI — uses the prompt template for logging/debug only.
 * Replace with a real LLM provider behind ArticleGenerationService.
 */
export class MockArticleGenerationService implements ArticleGenerationService {
  async generate(input: ArticleGenerationInput): Promise<GeneratedArticle> {
    // Simulate network latency in development
    await new Promise((r) => setTimeout(r, 800))

    const prompt = buildArticleGenerationPrompt(input)
    if (process.env.NODE_ENV === "development") {
      console.info("[MockArticleGeneration] Prompt length:", prompt.length)
    }

    const title = `${input.topic}: Kapsamlı Rehber`
    const slug = slugify(title)
    const sourceLabel =
      input.sourceType === "url" ? "web kaynağından" : "yüklenen belgeden"

    const summary = `${input.topic} konusunu ${sourceLabel} derleyerek hazırladığımız bu rehberde, temel kavramları, uygulama adımlarını ve en iyi uygulamaları Türkçe olarak özetliyoruz.`

    const excerpt = input.sourceContent.slice(0, 280).trim()

    const content = `## Giriş

${input.topic} alanında güncel gelişmeler, kurumların dijital dönüşüm yol haritasında önemli bir yer tutuyor. Bu makale, ${input.targetLanguage} dilinde hazırlanmış olup ${sourceLabel} elde edilen içerikten yararlanır.

## Kaynak özeti

${excerpt}${input.sourceContent.length > 280 ? "…" : ""}

## Temel kavramlar

- **Bağlam:** ${input.topic}
- **Kaynak türü:** ${input.sourceType === "url" ? "URL" : "Belge"}
- **Hedef kitle:** IT ve bulut mimarları

## Uygulama adımları

1. Mevcut altyapıyı değerlendirin ve hedef kullanım senaryolarını netleştirin.
2. Kaynak içeriğindeki önerileri kendi ortamınıza uyarlayın.
3. Pilot bir uygulama ile ölçülebilir KPI'lar belirleyin.
4. Üretim ortamına geçmeden önce güvenlik ve uyumluluk kontrollerini tamamlayın.

## En iyi uygulamalar

- Dokümantasyonu güncel tutun ve ekip içi bilgi paylaşımını teşvik edin.
- Otomasyon ve gözlemlenebilirlik araçlarını erken aşamada devreye alın.
- Maliyet ve performans metriklerini düzenli olarak izleyin.

## Sonuç

${input.topic} konusunda doğru strateji ve araçlarla kurumunuzun hedeflerine daha hızlı ulaşabilirsiniz. CloudContent TR ile üretilen bu taslak, editör incelemesine hazırdır.

---
*Bu içerik mock AI servisi ile üretilmiştir.*`

    const seoTitle = `${input.topic} | CloudContent TR`.slice(0, 60)
    const metaDescription = summary.slice(0, 160)

    const tags = [
      slugify(input.topic).replace(/-/g, " "),
      input.sourceType === "url" ? "web-icerik" : "belge",
      "bulut",
      "rehber",
      "turkce",
    ].filter(Boolean)

    return {
      title,
      slug: slug || `makale-${Date.now()}`,
      summary,
      content,
      seoTitle,
      metaDescription,
      tags: [...new Set(tags.map((t) => t.trim()).filter((t) => t.length > 1))].slice(0, 6),
    }
  }
}
