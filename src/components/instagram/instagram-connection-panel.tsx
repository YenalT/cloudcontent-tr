"use client"

import { useTransition } from "react"
import { Instagram, Link2, Loader2, Unlink } from "lucide-react"

import { disconnectInstagramAccount } from "@/lib/actions/instagram-graph"
import type { InstagramAccountPublic } from "@/lib/data/instagram-account"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type InstagramConnectionPanelProps = {
  account: InstagramAccountPublic | null
  metaConfigured: boolean
  oauthStartPath?: string
}

export function InstagramConnectionPanel({
  account,
  metaConfigured,
  oauthStartPath = "/api/instagram/oauth/start?returnTo=/instagram",
}: InstagramConnectionPanelProps) {
  const [isPending, startTransition] = useTransition()

  function handleDisconnect() {
    if (!account) return
    if (!confirm("Instagram hesap bağlantısını kaldırmak istediğinize emin misiniz?")) return
    startTransition(async () => {
      await disconnectInstagramAccount(account.id)
      window.location.reload()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Instagram className="h-5 w-5" />
          Instagram Graph API
        </CardTitle>
        <CardDescription>
          Business veya Creator hesabını Facebook sayfası üzerinden bağlayın.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!metaConfigured ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            META_APP_ID ve META_APP_SECRET ortam değişkenlerini tanımlayın.
          </p>
        ) : null}

        {account ? (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">@{account.username}</p>
                <p className="text-xs text-muted-foreground">
                  {account.facebookPageName ?? account.facebookPageId} ·{" "}
                  {account.accountType}
                </p>
              </div>
              {account.isActive ? (
                <span className="text-xs font-medium text-emerald-600">Aktif</span>
              ) : null}
            </div>
            {account.tokenMasked ? (
              <p className="text-xs text-muted-foreground">
                Page token: {account.tokenMasked}
              </p>
            ) : null}
            {account.tokenExpiresAt ? (
              <p className="text-xs text-muted-foreground">
                Token: {new Date(account.tokenExpiresAt).toLocaleString("tr-TR")}
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={isPending}
              onClick={handleDisconnect}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Unlink className="h-4 w-4" />
              )}
              Bağlantıyı kaldır
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Henüz bağlı Instagram hesabı yok.
          </p>
        )}

        <Button type="button" className="w-full" asChild disabled={!metaConfigured}>
          <a href={oauthStartPath}>
            <Link2 className="h-4 w-4" />
            {account ? "Hesabı yeniden bağla" : "Instagram hesabını bağla"}
          </a>
        </Button>

        <p className="text-xs text-muted-foreground">
          Yayın için <code>APP_PUBLIC_URL</code> Meta tarafından erişilebilir olmalıdır
          (localhost çalışmaz; ngrok veya staging kullanın). Yalnızca onaylanmış taslaklar
          yayınlanır.
        </p>
      </CardContent>
    </Card>
  )
}
