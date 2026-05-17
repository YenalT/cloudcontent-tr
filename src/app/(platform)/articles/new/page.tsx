import { PageHeader } from "@/components/shared/page-header"
import { ArticleGenerator } from "@/components/articles/article-generator"
import { getArticleGenerationOptions } from "@/lib/data/article-generation"
import { getArticleAiStatus } from "@/lib/data/article-ai-status"

export const dynamic = "force-dynamic"

export default async function NewArticlePage() {
  const [options, aiStatus] = await Promise.all([
    getArticleGenerationOptions(),
    getArticleAiStatus(),
  ])

  return (
    <>
      <PageHeader
        title="Yeni Makale"
        description="Kaynak seçin, konu belirleyin ve AI ile Türkçe makale üretin"
      />
      <ArticleGenerator {...options} aiStatus={aiStatus} />
    </>
  )
}
