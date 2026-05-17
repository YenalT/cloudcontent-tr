import { PageHeader } from "@/components/shared/page-header"
import { InstagramWorkspace } from "@/components/instagram/instagram-workspace"
import {
  getArticlesForInstagram,
  getInstagramDraftByArticleId,
} from "@/lib/data/instagram"
import { getActiveInstagramAccountPublic } from "@/lib/data/instagram-account"
import { isMetaConfigured } from "@/lib/instagram-graph/meta-config"

export const dynamic = "force-dynamic"

type InstagramPageProps = {
  searchParams: Promise<{ articleId?: string; connected?: string; error?: string }>
}

export default async function InstagramPage({ searchParams }: InstagramPageProps) {
  const params = await searchParams
  const [articles, instagramAccount] = await Promise.all([
    getArticlesForInstagram(),
    getActiveInstagramAccountPublic(),
  ])

  const selectedArticleId =
    params.articleId && articles.some((a) => a.id === params.articleId)
      ? params.articleId
      : articles[0]?.id

  const draft = selectedArticleId
    ? await getInstagramDraftByArticleId(selectedArticleId)
    : null

  const flashMessage = params.connected
    ? { type: "success" as const, text: params.connected }
    : params.error
      ? { type: "error" as const, text: params.error }
      : null

  return (
    <>
      <PageHeader
        title="Instagram"
        description="Makalelerden AI taslakları — onay sonrası Graph API ile yayın"
      />
      <InstagramWorkspace
        articles={articles}
        selectedArticleId={selectedArticleId}
        draft={draft}
        instagramAccount={instagramAccount}
        metaConfigured={isMetaConfigured()}
        flashMessage={flashMessage}
      />
    </>
  )
}
