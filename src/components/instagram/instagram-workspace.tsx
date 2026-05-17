"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Check,
  ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  Type,
  Upload,
  X,
} from "lucide-react"

import {
  approveInstagramDraft,
  generateInstagramDraft,
  regenerateInstagramCaption,
  regenerateInstagramPostImage,
  rejectInstagramDraft,
} from "@/lib/actions/instagram"
import { uploadInstagramPostImageToBlob } from "@/lib/actions/instagram-zapier"
import type { ArticleForInstagramPicker, InstagramDraftDetail } from "@/lib/data/instagram"
import type { InstagramAccountPublic } from "@/lib/data/instagram-account"
import { InstagramConnectionPanel } from "@/components/instagram/instagram-connection-panel"
import { InstagramImageDiagnostics } from "@/components/instagram/instagram-image-diagnostics"
import { InstagramPreviews } from "@/components/instagram/instagram-previews"
import { InstagramPromptPanel } from "@/components/instagram/instagram-prompt-panel"
import { InstagramZapierPanel } from "@/components/instagram/instagram-zapier-panel"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

type InstagramWorkspaceProps = {
  articles: ArticleForInstagramPicker[]
  selectedArticleId?: string
  draft: InstagramDraftDetail | null
  instagramAccount: InstagramAccountPublic | null
  metaConfigured: boolean
  flashMessage?: { type: "success" | "error"; text: string } | null
}

export function InstagramWorkspace({
  articles,
  selectedArticleId,
  draft,
  instagramAccount,
  metaConfigured,
  flashMessage,
}: InstagramWorkspaceProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [articleId, setArticleId] = useState(selectedArticleId ?? articles[0]?.id ?? "")
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  )

  const selectedArticle = articles.find((a) => a.id === articleId)
  const canApprove =
    draft &&
    (draft.status === "pending_review" || draft.status === "draft" || draft.status === "rejected")
  const canReject =
    draft &&
    (draft.status === "pending_review" ||
      draft.status === "draft" ||
      draft.status === "approved")

  function navigateToArticle(id: string) {
    setArticleId(id)
    router.push(`/instagram?articleId=${id}`)
  }

  function runAction(action: () => Promise<{ ok: boolean; message?: string }>) {
    setBanner(null)
    startTransition(async () => {
      const result = await action()
      setBanner({
        type: result.ok ? "success" : "error",
        text: result.message ?? (result.ok ? "Tamamlandı" : "Hata"),
      })
      if (result.ok) {
        router.refresh()
      }
    })
  }

  function handleActionResult(result: { ok: boolean; message?: string }) {
    setBanner({
      type: result.ok ? "success" : "error",
      text: result.message ?? (result.ok ? "Tamamlandı" : "Hata"),
    })
    if (result.ok) router.refresh()
  }

  return (
    <div className="grid gap-6 p-4 md:p-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <InstagramConnectionPanel
          account={instagramAccount}
          metaConfigured={metaConfigured}
        />

        {flashMessage ? (
          <p
            className={
              flashMessage.type === "success"
                ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                : "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            }
          >
            {flashMessage.text}
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Makale seç</CardTitle>
            <CardDescription>Instagram gönderi taslağı üretilecek makale</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {articles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                İçerikli makale yok.{" "}
                <Link href="/articles/new" className="text-primary underline">
                  Makale oluşturun
                </Link>
                .
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="article-select">Makale</Label>
                  <select
                    id="article-select"
                    className={selectClass}
                    value={articleId}
                    onChange={(e) => navigateToArticle(e.target.value)}
                    disabled={isPending}
                  >
                    {articles.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title}
                        {a.instagramDraft ? ` (${a.instagramDraft.status})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedArticle?.instagramDraft ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Durum:</span>
                    <StatusBadge status={selectedArticle.instagramDraft.status} />
                  </div>
                ) : null}

                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    className="w-full justify-start"
                    disabled={!articleId || isPending}
                    onClick={() => runAction(() => generateInstagramDraft(articleId))}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Gönderi Taslağı Oluştur
                  </Button>

                  {draft ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        disabled={isPending}
                        onClick={() => runAction(() => regenerateInstagramCaption(articleId))}
                      >
                        <Type className="h-4 w-4" />
                        Caption Yeniden Üret
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        disabled={isPending}
                        onClick={() => runAction(() => regenerateInstagramPostImage(articleId))}
                      >
                        <ImageIcon className="h-4 w-4" />
                        Görseli Yeniden Üret
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        disabled={isPending || !draft.azureBlobConfigured}
                        onClick={() =>
                          runAction(() => uploadInstagramPostImageToBlob(draft.id))
                        }
                      >
                        <Upload className="h-4 w-4" />
                        Görseli Blob&apos;a Yükle
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full justify-start"
                        disabled={!canApprove || isPending}
                        onClick={() => runAction(() => approveInstagramDraft(draft.id))}
                      >
                        <Check className="h-4 w-4" />
                        Taslağı Onayla
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-destructive hover:text-destructive"
                        disabled={!canReject || isPending}
                        onClick={() => runAction(() => rejectInstagramDraft(draft.id))}
                      >
                        <X className="h-4 w-4" />
                        Taslağı Reddet
                      </Button>
                    </>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Yayın politikası</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>Yalnızca tek kare Instagram gönderisi (story/carousel yok).</p>
            <p>Otomatik Zapier gönderimi yok — onay sonrası «Zapier&apos;e Gönder».</p>
            <p>Görsel public HTTPS URL olarak Zapier&apos;e gider (Azure Blob).</p>
          </CardContent>
        </Card>

        {banner ? (
          <p
            className={
              banner.type === "success"
                ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                : "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            }
          >
            {banner.text}
          </p>
        ) : null}
      </div>

      <div>
        {!draft ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <RefreshCw className="mb-4 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {articleId
                  ? "Bu makale için henüz Instagram taslağı yok. Oluşturmak için soldaki düğmeyi kullanın."
                  : "Başlamak için bir makale seçin."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{draft.articleTitle}</h2>
              <StatusBadge status={draft.status} />
              {draft.approvedAt ? (
                <span className="text-xs text-muted-foreground">
                  Onay: {new Date(draft.approvedAt).toLocaleString("tr-TR")}
                </span>
              ) : null}
              {draft.publishError ? (
                <span className="text-xs text-destructive">{draft.publishError}</span>
              ) : null}
            </div>
            <InstagramPreviews
              draft={draft}
              disabled={isPending}
              onActionResult={handleActionResult}
            />
            <InstagramImageDiagnostics
              draft={draft}
              disabled={isPending}
              onActionResult={handleActionResult}
            />
            <InstagramPromptPanel
              draft={draft}
              articleId={articleId}
              disabled={isPending}
              onActionResult={handleActionResult}
            />
            <InstagramZapierPanel
              draft={draft}
              disabled={isPending}
              onActionResult={handleActionResult}
            />
          </div>
        )}
      </div>
    </div>
  )
}
