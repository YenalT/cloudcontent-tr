"use client"

import { useState, useTransition } from "react"
import { Loader2, PlugZap, Save, Webhook } from "lucide-react"

import {
  saveZapierSettings,
  testZapierWebhookConnection,
} from "@/lib/actions/zapier-settings"
import type { ZapierSettingsPublic } from "@/lib/data/zapier-config"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

type ZapierSettingsFormProps = {
  settings: ZapierSettingsPublic
}

export function ZapierSettingsForm({ settings }: ZapierSettingsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isTesting, startTest] = useTransition()

  const [isActive, setIsActive] = useState(settings.isActive)
  const [timeoutMs, setTimeoutMs] = useState(String(settings.timeoutMs))
  const [maxRetries, setMaxRetries] = useState(String(settings.maxRetries))
  const [webhookUrl, setWebhookUrl] = useState("")
  const [updateWebhookUrl, setUpdateWebhookUrl] = useState(
    !settings.hasWebhookUrl && !settings.hasEnvWebhookUrl
  )
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null)

  function buildPayload() {
    return {
      isActive,
      timeoutMs: Number(timeoutMs),
      maxRetries: Number(maxRetries),
      webhookUrl: updateWebhookUrl ? webhookUrl : undefined,
      updateWebhookUrl,
    }
  }

  function handleSave() {
    setBanner(null)
    startTransition(async () => {
      const result = await saveZapierSettings(buildPayload())
      setBanner({
        type: result.ok ? "success" : "error",
        text: result.message ?? (result.ok ? "Kaydedildi" : "Hata"),
      })
      if (result.ok && updateWebhookUrl) {
        setWebhookUrl("")
        setUpdateWebhookUrl(false)
      }
    })
  }

  function handleTest() {
    setBanner(null)
    startTest(async () => {
      const result = await testZapierWebhookConnection(buildPayload())
      const latency = result.latencyMs != null ? ` (${result.latencyMs}ms)` : ""
      setBanner({
        type: result.ok ? "success" : "error",
        text: (result.message ?? "") + latency,
      })
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Webhook className="h-4 w-4" />
          Zapier Integration
        </CardTitle>
        <CardDescription>
          Instagram taslakları onaylandıktan sonra Zapier catch hook’a webhook gönderilir. URL
          yalnızca sunucuda şifreli saklanır.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!settings.encryptionConfigured ? (
          <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            Veritabanına URL kaydetmek için SETTINGS_ENCRYPTION_KEY gerekir. Alternatif olarak
            sunucuda ZAPIER_WEBHOOK_URL tanımlayabilirsiniz.
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="zapier-active">Etkin</Label>
            <p className="text-xs text-muted-foreground">
              Kapalıyken Zapier’e gönderim yapılamaz.
            </p>
          </div>
          <Switch id="zapier-active" checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <Separator />

        <div className="space-y-3">
          <Label htmlFor="zapier-webhook-url">Webhook URL</Label>
          {settings.webhookUrlMasked ? (
            <p className="text-xs text-muted-foreground font-mono">{settings.webhookUrlMasked}</p>
          ) : null}
          {settings.hasEnvWebhookUrl ? (
            <p className="text-xs text-muted-foreground">
              Sunucuda ZAPIER_WEBHOOK_URL tanımlı (değer gösterilmez).
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <Switch
              id="zapier-update-url"
              checked={updateWebhookUrl}
              onCheckedChange={setUpdateWebhookUrl}
              disabled={!settings.encryptionConfigured}
            />
            <Label htmlFor="zapier-update-url" className="font-normal">
              Webhook URL güncelle
            </Label>
          </div>
          {updateWebhookUrl ? (
            <Input
              id="zapier-webhook-url"
              type="url"
              autoComplete="off"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.zapier.com/hooks/catch/..."
            />
          ) : null}
          <p className="text-xs text-muted-foreground">
            Yalnızca https://hooks.zapier.com/ catch hook adresleri kabul edilir.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="zapier-timeout">Timeout (ms)</Label>
            <Input
              id="zapier-timeout"
              type="number"
              value={timeoutMs}
              onChange={(e) => setTimeoutMs(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zapier-retries">Yeniden deneme</Label>
            <Input
              id="zapier-retries"
              type="number"
              min={0}
              max={5}
              value={maxRetries}
              onChange={(e) => setMaxRetries(e.target.value)}
            />
          </div>
        </div>

        {banner ? (
          <p
            className={
              banner.type === "success"
                ? "rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200"
                : "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            }
          >
            {banner.text}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleSave} disabled={isPending || isTesting}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={isPending || isTesting}
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlugZap className="h-4 w-4" />
            )}
            Webhook test et
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
