"use client"

import { useState, useTransition } from "react"
import { Check, Copy, Loader2, RefreshCw, Send, Upload } from "lucide-react"

import {
  retryInstagramAssetUploads,
  retryInstagramZapierWebhook,
  sendInstagramDraftToZapier,
  uploadInstagramAssetsToBlob,
} from "@/lib/actions/instagram-zapier"
import type { InstagramDraftDetail } from "@/lib/data/instagram"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/status-badge"

type InstagramZapierPanelProps = {
  draft: InstagramDraftDetail
  onActionResult: (result: { ok: boolean; message?: string }) => void
  disabled?: boolean
}

function truncate(text: string | null | undefined, max = 400) {
  if (!text) return "—"
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function assetLabel(assetKey: string) {
  return assetKey === "post" ? "Gönderi görseli" : assetKey
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function InstagramZapierPanel({
  draft,
  onActionResult,
  disabled = false,
}: InstagramZapierPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmRetry, setConfirmRetry] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const canSendToZapier = draft.status === "approved" && draft.canSendToZapier
  const canRetry = draft.status === "failed" || draft.status === "sent_to_zapier"
  const hasLocalOnly = draft.socialAssets.some(
    (a) => a.uploadStatus === "local_only" || a.storageProvider !== "azure"
  )
  const hasFailedUploads = draft.socialAssets.some((a) => a.uploadStatus === "failed")

  const delivery = draft.zapierDelivery

  function runSend(isRetry: boolean) {
    startTransition(async () => {
      const result = isRetry
        ? await retryInstagramZapierWebhook(draft.id)
        : await sendInstagramDraftToZapier(draft.id)
      onActionResult(result)
      setConfirmOpen(false)
      setConfirmRetry(false)
    })
  }

  function runUploadToBlob() {
    startTransition(async () => {
      const result = await uploadInstagramAssetsToBlob(draft.id)
      onActionResult(result)
    })
  }

  function runRetryUpload() {
    startTransition(async () => {
      const result = await retryInstagramAssetUploads(draft.id)
      onActionResult(result)
    })
  }

  function uploadStatusLabel(status: string) {
    if (status === "local_only") return "Yalnızca yerel"
    if (status === "uploading") return "Yükleniyor"
    if (status === "uploaded") return "Blob’da"
    if (status === "failed") return "Başarısız"
    return status
  }

  function handleCopy(key: string, url: string | null) {
    if (!url) return
    void copyToClipboard(url).then((ok) => {
      if (ok) {
        setCopiedKey(key)
        setTimeout(() => setCopiedKey(null), 2000)
      }
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Blob depolama ve Zapier</CardTitle>
          <CardDescription>
            Tek gönderi görseli Azure Blob&apos;a yüklenir; Zapier yalnızca postImageUrl alır.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Depolama:</span>
            <StatusBadge
              status={draft.storageProvider === "azure" ? "published" : "pending_review"}
            />
            <span className="text-xs text-muted-foreground">
              {draft.storageProvider === "azure" ? "Azure Blob" : "Yerel (geliştirme)"}
            </span>
          </div>

          {draft.localStorageWarning ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
              {draft.localStorageWarning}
            </p>
          ) : null}

          <div className="space-y-2">
            <p className="text-sm font-medium">Yüklenen görseller</p>
            {draft.socialAssets.length === 0 ? (
              <p className="text-xs text-muted-foreground">Henüz görsel yüklenmedi.</p>
            ) : (
              <ul className="space-y-2">
                {draft.socialAssets.map((asset) => (
                  <li
                    key={asset.id}
                    className="rounded-md border bg-muted/30 p-3 text-xs space-y-1"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{assetLabel(asset.assetKey)}</span>
                      <span className="text-muted-foreground">
                        {uploadStatusLabel(asset.uploadStatus)}
                      </span>
                      <StatusBadge
                        status={
                          asset.uploadStatus === "uploaded" && asset.storageProvider === "azure"
                            ? "published"
                            : asset.uploadStatus === "failed"
                              ? "failed"
                              : "pending_review"
                        }
                      />
                      {asset.uploadedAt ? (
                        <span className="text-muted-foreground">
                          {new Date(asset.uploadedAt).toLocaleString("tr-TR")}
                        </span>
                      ) : null}
                    </div>
                    {asset.publicUrl ? (
                      <p className="break-all text-muted-foreground">{asset.publicUrl}</p>
                    ) : (
                      <p className="text-destructive">{asset.uploadError ?? "URL yok"}</p>
                    )}
                    <p className="text-muted-foreground">
                      {asset.mimeType}
                      {asset.detectedMimeType && asset.detectedMimeType !== asset.mimeType
                        ? ` (kaynak: ${asset.detectedMimeType})`
                        : ""}
                      {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
                      {asset.fileSizeBytes
                        ? ` · ${Math.round(asset.fileSizeBytes / 1024)} KB`
                        : ""}
                    </p>
                    {asset.blobValidationOk != null ? (
                      <p
                        className={
                          asset.blobValidationOk ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"
                        }
                      >
                        Blob doğrulama:{" "}
                        {asset.blobValidationOk ? "Geçerli" : asset.blobValidationMessage ?? "Başarısız"}
                      </p>
                    ) : null}
                    {asset.publicUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => handleCopy(asset.assetKey, asset.publicUrl)}
                      >
                        {copiedKey === asset.assetKey ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        Public URL kopyala
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || isPending || !draft.azureBlobConfigured}
              onClick={runUploadToBlob}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Görseli Blob&apos;a Yükle
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || isPending || (!hasFailedUploads && !hasLocalOnly)}
              onClick={runRetryUpload}
            >
              <RefreshCw className="h-4 w-4" />
              Başarısızları Tekrar Dene
            </Button>
          </div>

          {draft.uploadLogs.length > 0 ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">Yükleme logları</p>
              <ul className="max-h-32 overflow-y-auto rounded-md border bg-muted/20 p-2 text-xs space-y-1">
                {draft.uploadLogs.map((log) => (
                  <li key={log.id} className="text-muted-foreground">
                    <span className="font-medium">{log.assetKey ?? "—"}</span> · {log.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Webhook payload önizleme</p>
            {draft.zapierPayloadPreview ? (
              <pre className="max-h-48 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
                {JSON.stringify(draft.zapierPayloadPreview, null, 2)}
              </pre>
            ) : (
              <p className="text-xs text-destructive">
                {draft.zapierPayloadValidationError ??
                  "Payload oluşturulamadı. Tüm görsellerin public HTTPS URL olduğundan emin olun."}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <span className="text-sm text-muted-foreground">Zapier teslimat:</span>
            {delivery ? (
              <StatusBadge status={delivery.success ? "sent_to_zapier" : "failed"} />
            ) : (
              <StatusBadge status={draft.status} />
            )}
            {delivery?.sentAt ? (
              <span className="text-xs text-muted-foreground">
                {new Date(delivery.sentAt).toLocaleString("tr-TR")}
                {delivery.retryCount > 0 ? ` · ${delivery.retryCount} yeniden deneme` : ""}
              </span>
            ) : null}
          </div>

          {delivery ? (
            <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-2">
              <p>
                <span className="font-medium">Durum:</span>{" "}
                {delivery.success ? "Başarılı" : "Başarısız"}
              </p>
              <p>
                <span className="font-medium">HTTP:</span> {delivery.responseStatus ?? "—"}
              </p>
              {delivery.durationMs != null ? (
                <p>
                  <span className="font-medium">Süre:</span> {delivery.durationMs} ms
                </p>
              ) : null}
              {delivery.errorCode ? (
                <p>
                  <span className="font-medium">Hata kodu:</span> {delivery.errorCode}
                </p>
              ) : null}
              {delivery.errorMessage ? (
                <p className="text-destructive">
                  <span className="font-medium">Hata:</span> {delivery.errorMessage}
                </p>
              ) : null}
              {delivery.suggestedAction ? (
                <p className="text-amber-800 dark:text-amber-200">
                  <span className="font-medium">Öneri:</span> {delivery.suggestedAction}
                </p>
              ) : null}
              {delivery.postImageUrl ? (
                <p className="break-all">
                  <span className="font-medium">postImageUrl:</span> {delivery.postImageUrl}
                </p>
              ) : null}
              {delivery.webhookUrlMasked ? (
                <p>
                  <span className="font-medium">Webhook:</span> {delivery.webhookUrlMasked}
                </p>
              ) : null}
              {delivery.requestPayloadPreview ? (
                <pre className="max-h-24 overflow-auto rounded bg-muted/60 p-2">
                  {typeof delivery.requestPayloadPreview === "string"
                    ? delivery.requestPayloadPreview
                    : JSON.stringify(delivery.requestPayloadPreview, null, 2)}
                </pre>
              ) : null}
              <p className="whitespace-pre-wrap break-words">
                <span className="font-medium">Yanıt gövdesi:</span> {truncate(delivery.responseBody)}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Henüz Zapier&apos;e gönderilmedi.</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={!canSendToZapier || disabled || isPending}
              onClick={() => setConfirmOpen(true)}
            >
              {isPending && !confirmRetry ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Zapier&apos;e Gönder
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canRetry || disabled || isPending}
              onClick={() => setConfirmRetry(true)}
            >
              {isPending && confirmRetry ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Webhook&apos;u Tekrar Dene
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zapier&apos;e gönder</DialogTitle>
            <DialogDescription>
              «{draft.articleTitle}» taslağı Zapier webhook&apos;una gönderilecek. Görsel URL&apos;leri
              payload içinde otomatik yer alır.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              İptal
            </Button>
            <Button type="button" disabled={isPending} onClick={() => runSend(false)}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmRetry} onOpenChange={setConfirmRetry}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Webhook&apos;u tekrar dene</DialogTitle>
            <DialogDescription>
              Zapier&apos;e yeniden gönderim yapılacak. Önceki denemeler loglanmaya devam eder.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmRetry(false)}>
              İptal
            </Button>
            <Button type="button" disabled={isPending} onClick={() => runSend(true)}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Tekrar dene
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
