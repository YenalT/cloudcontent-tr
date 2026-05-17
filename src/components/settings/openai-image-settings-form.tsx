"use client"

import { useState, useTransition } from "react"
import { ImageIcon, Loader2, PlugZap, Save } from "lucide-react"

import {
  saveOpenAiImageSettings,
  testOpenAiImageSettingsConnection,
} from "@/lib/actions/image-provider-settings"
import type { OpenAiImageSettingsPublic } from "@/lib/data/image-provider-config"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

type OpenAiImageSettingsFormProps = {
  settings: OpenAiImageSettingsPublic
}

const QUALITY_OPTIONS = [
  { value: "low", label: "Düşük" },
  { value: "medium", label: "Orta" },
  { value: "high", label: "Yüksek" },
  { value: "auto", label: "Otomatik" },
] as const

const FORMAT_OPTIONS = [
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPEG" },
  { value: "webp", label: "WebP" },
] as const

export function OpenAiImageSettingsForm({ settings }: OpenAiImageSettingsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isTesting, startTest] = useTransition()

  const [model, setModel] = useState(settings.model)
  const [quality, setQuality] = useState(settings.quality)
  const [outputFormat, setOutputFormat] = useState(settings.outputFormat)
  const [timeoutMs, setTimeoutMs] = useState(String(settings.timeoutMs))
  const [isActive, setIsActive] = useState(settings.isActive)
  const [apiKey, setApiKey] = useState("")
  const [updateApiKey, setUpdateApiKey] = useState(!settings.hasApiKey && !settings.hasEnvApiKey)
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  function buildPayload() {
    return {
      model,
      quality,
      outputFormat,
      timeoutMs: Number(timeoutMs),
      isActive,
      apiKey: updateApiKey ? apiKey : undefined,
      updateApiKey,
    }
  }

  function handleSave() {
    setBanner(null)
    startTransition(async () => {
      const result = await saveOpenAiImageSettings(buildPayload())
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
      const result = await testOpenAiImageSettingsConnection(buildPayload())
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
          <ImageIcon className="h-4 w-4" />
          OpenAI Görüntü Üretimi
        </CardTitle>
        <CardDescription>
          Instagram gönderi, hikaye ve carousel görselleri için GPT Image API (gpt-image-1). API
          anahtarı yalnızca sunucuda şifreli saklanır.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!settings.encryptionConfigured ? (
          <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            Veritabanına anahtar kaydetmek için SETTINGS_ENCRYPTION_KEY gerekir. Alternatif olarak
            yalnızca sunucu ortamında OPENAI_API_KEY tanımlayabilirsiniz.
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="openai-image-active">Etkin</Label>
            <p className="text-xs text-muted-foreground">
              Etkinleştirildiğinde Instagram görsel üretimi OpenAI kullanır (Mock devre dışı).
            </p>
          </div>
          <Switch id="openai-image-active" checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="openai-model">Model</Label>
            <Input
              id="openai-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-image-1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="openai-timeout">Timeout (ms)</Label>
            <Input
              id="openai-timeout"
              type="number"
              value={timeoutMs}
              onChange={(e) => setTimeoutMs(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="openai-quality">Kalite</Label>
            <select
              id="openai-quality"
              className={selectClass}
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
            >
              {QUALITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="openai-format">Çıktı biçimi</Label>
            <select
              id="openai-format"
              className={selectClass}
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
            >
              {FORMAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <Label htmlFor="openai-api-key">OpenAI API Key</Label>
          {settings.hasApiKey && settings.apiKeyMasked ? (
            <p className="text-xs text-muted-foreground">
              Kayıtlı anahtar: <span className="font-mono">{settings.apiKeyMasked}</span>
            </p>
          ) : null}
          {settings.hasEnvApiKey ? (
            <p className="text-xs text-muted-foreground">
              Sunucuda OPENAI_API_KEY ortam değişkeni tanımlı (değer gösterilmez).
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <Switch
              id="openai-update-key"
              checked={updateApiKey}
              onCheckedChange={setUpdateApiKey}
              disabled={!settings.encryptionConfigured}
            />
            <Label htmlFor="openai-update-key" className="font-normal">
              API anahtarını güncelle
            </Label>
          </div>
          {updateApiKey ? (
            <Input
              id="openai-api-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
          ) : null}
          <p className="text-xs text-muted-foreground">
            Anahtar asla tarayıcıya veya loglara yazılmaz. Kaynak koduna eklemeyin.
          </p>
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
            Bağlantıyı test et
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
