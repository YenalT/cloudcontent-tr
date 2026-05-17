"use client"

import { useState, useTransition } from "react"
import { Loader2, PlugZap, Save } from "lucide-react"

import {
  saveAzureOpenAiSettings,
  testAzureOpenAiSettingsConnection,
} from "@/lib/actions/ai-provider-settings"
import type { AzureOpenAiSettingsPublic } from "@/lib/data/ai-provider-config"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

type AzureOpenAiSettingsFormProps = {
  settings: AzureOpenAiSettingsPublic
}

export function AzureOpenAiSettingsForm({ settings }: AzureOpenAiSettingsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isTesting, startTest] = useTransition()

  const [endpoint, setEndpoint] = useState(settings.endpoint)
  const [deploymentName, setDeploymentName] = useState(settings.deploymentName)
  const [apiVersion, setApiVersion] = useState(settings.apiVersion)
  const [temperature, setTemperature] = useState(String(settings.temperature))
  const [maxTokens, setMaxTokens] = useState(String(settings.maxTokens))
  const [timeoutMs, setTimeoutMs] = useState(String(settings.timeoutMs))
  const [isActive, setIsActive] = useState(settings.isActive)
  const [apiKey, setApiKey] = useState("")
  const [updateApiKey, setUpdateApiKey] = useState(!settings.hasApiKey)
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  )

  function buildPayload() {
    return {
      endpoint,
      deploymentName,
      apiVersion,
      temperature: Number(temperature),
      maxTokens: Number(maxTokens),
      timeoutMs: Number(timeoutMs),
      isActive,
      apiKey: updateApiKey ? apiKey : undefined,
      updateApiKey,
    }
  }

  function handleSave() {
    setBanner(null)
    startTransition(async () => {
      const result = await saveAzureOpenAiSettings(buildPayload())
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
      const result = await testAzureOpenAiSettingsConnection(buildPayload())
      const latency =
        result.latencyMs != null ? ` (${result.latencyMs}ms)` : ""
      setBanner({
        type: result.ok ? "success" : "error",
        text: (result.message ?? "") + latency,
      })
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Azure OpenAI</CardTitle>
        <CardDescription>
          Makale üretimi için Azure OpenAI yapılandırması. API anahtarı sunucuda şifreli
          saklanır ve istemciye gönderilmez.
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
            <Label htmlFor="azure-active">Sağlayıcı aktif</Label>
            <p className="text-xs text-muted-foreground">
              Etkinleştirildiğinde makale üretimi Azure OpenAI kullanır.
            </p>
          </div>
          <Switch id="azure-active" checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="endpoint">Endpoint</Label>
            <Input
              id="endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://your-resource.openai.azure.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deployment">Deployment adı</Label>
            <Input
              id="deployment"
              value={deploymentName}
              onChange={(e) => setDeploymentName(e.target.value)}
              placeholder="gpt-4o"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="api-version">API sürümü</Label>
            <Input
              id="api-version"
              value={apiVersion}
              onChange={(e) => setApiVersion(e.target.value)}
              placeholder="2024-08-01-preview"
            />
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature</Label>
            <Input
              id="temperature"
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-tokens">Max tokens</Label>
            <Input
              id="max-tokens"
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeout">Timeout (ms)</Label>
            <Input
              id="timeout"
              type="number"
              value={timeoutMs}
              onChange={(e) => setTimeoutMs(e.target.value)}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="api-key">API anahtarı</Label>
            {settings.hasApiKey && settings.apiKeyMasked ? (
              <span className="text-xs text-muted-foreground">
                Kayıtlı: {settings.apiKeyMasked}
              </span>
            ) : null}
          </div>
          {settings.hasApiKey ? (
            <div className="flex items-center gap-2">
              <Switch
                id="update-key"
                checked={updateApiKey}
                onCheckedChange={setUpdateApiKey}
              />
              <Label htmlFor="update-key" className="font-normal text-sm">
                API anahtarını güncelle
              </Label>
            </div>
          ) : null}
          {(updateApiKey || !settings.hasApiKey) && (
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Azure OpenAI API key"
              autoComplete="new-password"
            />
          )}
          <p className="text-xs text-muted-foreground">
            Anahtar yalnızca sunucuda şifrelenir; tarayıcıya veya API yanıtlarına dahil
            edilmez.
          </p>
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
