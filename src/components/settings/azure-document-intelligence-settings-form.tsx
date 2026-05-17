"use client"

import { useState, useTransition } from "react"
import { Loader2, PlugZap, Save } from "lucide-react"

import {
  saveAzureDocumentIntelligenceSettings,
  testAzureDocumentIntelligenceSettingsConnection,
} from "@/lib/actions/document-extraction-settings"
import type { AzureDocumentIntelligenceSettingsPublic } from "@/lib/data/document-extraction-config"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

type AzureDocumentIntelligenceSettingsFormProps = {
  settings: AzureDocumentIntelligenceSettingsPublic
}

export function AzureDocumentIntelligenceSettingsForm({
  settings,
}: AzureDocumentIntelligenceSettingsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isTesting, startTest] = useTransition()

  const [endpoint, setEndpoint] = useState(settings.endpoint)
  const [apiVersion, setApiVersion] = useState(settings.apiVersion)
  const [timeoutMs, setTimeoutMs] = useState(String(settings.timeoutMs))
  const [pollIntervalMs, setPollIntervalMs] = useState(String(settings.pollIntervalMs))
  const [maxPollAttempts, setMaxPollAttempts] = useState(String(settings.maxPollAttempts))
  const [isActive, setIsActive] = useState(settings.isActive)
  const [apiKey, setApiKey] = useState("")
  const [updateApiKey, setUpdateApiKey] = useState(!settings.hasApiKey)
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  )

  function buildPayload() {
    return {
      endpoint,
      apiVersion,
      timeoutMs: Number(timeoutMs),
      pollIntervalMs: Number(pollIntervalMs),
      maxPollAttempts: Number(maxPollAttempts),
      isActive,
      apiKey: updateApiKey ? apiKey : undefined,
      updateApiKey,
    }
  }

  function handleSave() {
    setBanner(null)
    startTransition(async () => {
      const result = await saveAzureDocumentIntelligenceSettings(buildPayload())
      setBanner({
        type: result.ok ? "success" : "error",
        text: result.message ?? (result.ok ? "Kaydedildi" : "Hata"),
      })
      if (result.ok && updateApiKey) {
        setApiKey("")
        setUpdateApiKey(false)
      }
    })
  }

  function handleTest() {
    setBanner(null)
    startTest(async () => {
      const result = await testAzureDocumentIntelligenceSettingsConnection(buildPayload())
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
        <CardTitle>Azure Document Intelligence</CardTitle>
        <CardDescription>
          PDF, DOCX ve PPTX dosyalarından metin çıkarımı. API anahtarı sunucuda şifreli saklanır.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!settings.encryptionConfigured ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            SETTINGS_ENCRYPTION_KEY sunucuda yüklü değil. Üstteki durum kutusunu kontrol edin,
            <code className="mx-1">.env</code> dosyasına ekleyin ve{" "}
            <code className="mx-1">npm run dev</code> ile sunucuyu yeniden başlatın.
          </p>
        ) : null}

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label htmlFor="doc-intel-active">Sağlayıcı aktif</Label>
            <p className="text-xs text-muted-foreground">
              Etkinleştirildiğinde yüklenen belgelerden metin çıkarılır.
            </p>
          </div>
          <Switch id="doc-intel-active" checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="doc-endpoint">Endpoint</Label>
            <Input
              id="doc-endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://your-resource.cognitiveservices.azure.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-api-version">API sürümü</Label>
            <Input
              id="doc-api-version"
              value={apiVersion}
              onChange={(e) => setApiVersion(e.target.value)}
              placeholder="2024-11-30"
            />
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="doc-timeout">Timeout (ms)</Label>
            <Input
              id="doc-timeout"
              type="number"
              value={timeoutMs}
              onChange={(e) => setTimeoutMs(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-poll-interval">Poll aralığı (ms)</Label>
            <Input
              id="doc-poll-interval"
              type="number"
              value={pollIntervalMs}
              onChange={(e) => setPollIntervalMs(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doc-poll-max">Maks. poll denemesi</Label>
            <Input
              id="doc-poll-max"
              type="number"
              value={maxPollAttempts}
              onChange={(e) => setMaxPollAttempts(e.target.value)}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="doc-api-key">API anahtarı</Label>
            {settings.hasApiKey && settings.apiKeyMasked ? (
              <span className="text-xs text-muted-foreground">
                Kayıtlı: {settings.apiKeyMasked}
              </span>
            ) : null}
          </div>
          {settings.hasApiKey ? (
            <div className="flex items-center gap-2">
              <Switch
                id="doc-update-key"
                checked={updateApiKey}
                onCheckedChange={setUpdateApiKey}
              />
              <Label htmlFor="doc-update-key" className="font-normal text-sm">
                API anahtarını güncelle
              </Label>
            </div>
          ) : null}
          {(updateApiKey || !settings.hasApiKey) && (
            <Input
              id="doc-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Azure Document Intelligence API key"
              autoComplete="new-password"
            />
          )}
        </div>

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

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleSave} disabled={isPending || isTesting}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={isPending || isTesting || !settings.encryptionConfigured}
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlugZap className="h-4 w-4" />
            )}
            Bağlantıyı test et
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
