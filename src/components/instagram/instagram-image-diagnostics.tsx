"use client"

import { useTransition } from "react"
import { Loader2, RefreshCw, Sparkles } from "lucide-react"

import {
  optimizeInstagramPostImageForPublishing,
  reprocessInstagramPostImage,
} from "@/lib/actions/instagram-zapier"
import type { InstagramDraftDetail } from "@/lib/data/instagram"
import { formatFileSize } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type InstagramImageDiagnosticsProps = {
  draft: InstagramDraftDetail
  disabled?: boolean
  onActionResult?: (result: { ok: boolean; message?: string }) => void
}

export function InstagramImageDiagnostics({
  draft,
  disabled = false,
  onActionResult,
}: InstagramImageDiagnosticsProps) {
  const [isPending, startTransition] = useTransition()
  const asset = draft.postAsset
  const compat = asset?.instagramCompatibility

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await action()
      onActionResult?.(result)
    })
  }

  if (!draft.postImageUrl && !asset) {
    return null
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Görsel teknik bilgi</CardTitle>
        <CardDescription>
          Instagram önerisi: 1080×1080 kare, JPEG, tercihen 5 MB altı
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Boyut</dt>
            <dd className="font-mono">
              {asset?.width && asset?.height
                ? `${asset.width}×${asset.height}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Dosya boyutu</dt>
            <dd className="font-mono">
              {asset?.fileSizeBytes != null ? formatFileSize(asset.fileSizeBytes) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">MIME</dt>
            <dd className="font-mono">{asset?.mimeType ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Kaynak MIME</dt>
            <dd className="font-mono">{asset?.detectedMimeType ?? "—"}</dd>
          </div>
        </dl>

        {compat ? (
          <div
            className={cn(
              "rounded-md border px-3 py-2 text-sm",
              compat.status === "compatible" &&
                "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
              compat.status === "warning" &&
                "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
              compat.status === "incompatible" && "border-destructive/40 bg-destructive/10 text-destructive"
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Instagram uyumluluk:</span>
              <Badge
                variant={
                  compat.status === "compatible"
                    ? "default"
                    : compat.status === "warning"
                      ? "secondary"
                      : "destructive"
                }
              >
                {compat.label}
              </Badge>
            </div>
            {compat.issues.length > 0 ? (
              <ul className="mt-2 list-disc pl-5 text-xs space-y-1">
                {compat.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : null}
            {compat.suggestions.length > 0 ? (
              <p className="mt-2 text-xs opacity-90">{compat.suggestions.join(" ")}</p>
            ) : null}
          </div>
        ) : null}

        {asset?.blobValidationMessage ? (
          <p className="text-xs text-muted-foreground">
            Blob doğrulama: {asset.blobValidationMessage}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isPending || !asset}
            onClick={() => run(() => reprocessInstagramPostImage(draft.id))}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Görseli Yeniden İşle
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || isPending || !asset}
            onClick={() => run(() => optimizeInstagramPostImageForPublishing(draft.id))}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Instagram için Optimize Et
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
