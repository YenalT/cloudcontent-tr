"use client"

import type { InstagramDraftDetail } from "@/lib/data/instagram"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { saveInstagramTaggedUsers } from "@/lib/actions/instagram"
import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"

type InstagramPreviewsProps = {
  draft: InstagramDraftDetail
  disabled?: boolean
  onActionResult?: (result: { ok: boolean; message?: string }) => void
}

export function InstagramPreviews({
  draft,
  disabled = false,
  onActionResult,
}: InstagramPreviewsProps) {
  const [isPending, startTransition] = useTransition()
  const [taggedInput, setTaggedInput] = useState(draft.taggedUsers.map((u) => `@${u}`).join(", "))

  function saveTags() {
    const users = taggedInput
      .split(/[,\s]+/)
      .map((u) => u.trim().replace(/^@/, ""))
      .filter(Boolean)

    startTransition(async () => {
      const result = await saveInstagramTaggedUsers(draft.id, { taggedUsers: users })
      onActionResult?.(result)
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Gönderi önizleme</CardTitle>
          <CardDescription>
            Tek kare Instagram gönderisi · OpenAI 1024² → yayın 1080² JPEG · makaleyi görsel olarak özetler
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto aspect-square w-full max-w-[360px] overflow-hidden rounded-lg border bg-muted">
            {draft.postImageUrl ? (
              <img
                src={draft.postImageUrl}
                alt="Instagram post"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Görsel yok
              </div>
            )}
          </div>
          {draft.postAsset ? (
            <p className="mt-2 text-xs text-muted-foreground text-center">
              {draft.postAsset.mimeType}
              {draft.postAsset.width && draft.postAsset.height
                ? ` · ${draft.postAsset.width}×${draft.postAsset.height}`
                : ""}
              {draft.postAsset.fileSizeBytes
                ? ` · ${Math.round(draft.postAsset.fileSizeBytes / 1024)} KB`
                : ""}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Caption</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{draft.caption}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hashtagler</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-primary">
            {draft.hashtags.map((t) => `#${t.replace(/^#/, "")}`).join(" ")}
          </p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Etiketlenecek kullanıcılar</CardTitle>
          <CardDescription>
            Zapier&apos;e taggedUsersCsv olarak gönderilir (virgülle ayırın, @ isteğe bağlı)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="tagged-users">Kullanıcı adları</Label>
            <Input
              id="tagged-users"
              value={taggedInput}
              onChange={(e) => setTaggedInput(e.target.value)}
              placeholder="kullanici1, kullanici2"
              disabled={disabled || isPending}
            />
          </div>
          <Button type="button" onClick={saveTags} disabled={disabled || isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Kaydet
          </Button>
        </CardContent>
      </Card>

      {draft.postImageUrl ? (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Public görsel URL</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="break-all text-xs font-mono text-muted-foreground">{draft.postImageUrl}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
