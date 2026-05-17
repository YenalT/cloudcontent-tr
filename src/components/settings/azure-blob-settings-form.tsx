"use client"

import { useState, useTransition } from "react"
import { Cloud, FolderPlus, Globe, Loader2, Save } from "lucide-react"

import {
  createAzureBlobContainerIfMissing,
  saveStorageProviderSettings,
  testAzureBlobConnection,
  testAzureBlobPublicUrlAccess,
} from "@/lib/actions/storage-provider-settings"
import type { StorageProviderSettingsPublic } from "@/lib/data/storage-provider-config"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

type AzureBlobSettingsFormProps = {
  settings: StorageProviderSettingsPublic
}

export function AzureBlobSettingsForm({ settings }: AzureBlobSettingsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isTesting, startTest] = useTransition()
  const [isCreating, startCreate] = useTransition()
  const [isTestingUrl, startTestUrl] = useTransition()

  const [storageAccountName, setStorageAccountName] = useState(settings.storageAccountName)
  const [containerName, setContainerName] = useState(settings.containerName)
  const [publicBaseUrl, setPublicBaseUrl] = useState(settings.publicBaseUrl)
  const [enablePublicUrls, setEnablePublicUrls] = useState(settings.enablePublicUrls)
  const [isActive, setIsActive] = useState(settings.isActive)
  const [connectionString, setConnectionString] = useState("")
  const [updateConnectionString, setUpdateConnectionString] = useState(
    !settings.hasConnectionString && !settings.hasEnvConnectionString
  )
  const [testPublicUrl, setTestPublicUrl] = useState("")
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null)

  function buildPayload() {
    return {
      storageAccountName,
      containerName,
      publicBaseUrl: publicBaseUrl || undefined,
      enablePublicUrls,
      isActive,
      connectionString: updateConnectionString ? connectionString : undefined,
      updateConnectionString,
    }
  }

  function handleSave() {
    setBanner(null)
    startTransition(async () => {
      const result = await saveStorageProviderSettings(buildPayload())
      setBanner({
        type: result.ok ? "success" : "error",
        text: result.message ?? (result.ok ? "Kaydedildi" : "Hata"),
      })
      if (result.ok && updateConnectionString) {
        setConnectionString("")
        setUpdateConnectionString(false)
      }
    })
  }

  function handleTestConnection() {
    setBanner(null)
    startTest(async () => {
      const result = await testAzureBlobConnection(buildPayload())
      const latency = result.latencyMs != null ? ` (${result.latencyMs}ms)` : ""
      setBanner({
        type: result.ok ? "success" : "error",
        text: (result.message ?? "") + latency,
      })
    })
  }

  function handleCreateContainer() {
    setBanner(null)
    startCreate(async () => {
      const result = await createAzureBlobContainerIfMissing(buildPayload())
      setBanner({
        type: result.ok ? "success" : "error",
        text: result.message ?? "",
      })
    })
  }

  function handleTestPublicUrl() {
    setBanner(null)
    startTestUrl(async () => {
      const url =
        testPublicUrl.trim() ||
        (publicBaseUrl.trim()
          ? `${publicBaseUrl.replace(/\/+$/, "")}/example/post.png`
          : "")
      if (!url) {
        setBanner({ type: "error", text: "Test için Public Base URL veya örnek blob URL girin." })
        return
      }
      const result = await testAzureBlobPublicUrlAccess({ publicUrl: url })
      const latency = result.latencyMs != null ? ` (${result.latencyMs}ms)` : ""
      setBanner({
        type: result.ok ? "success" : "error",
        text: (result.message ?? "") + latency,
      })
    })
  }

  const busy = isPending || isTesting || isCreating || isTestingUrl

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Cloud className="h-4 w-4" />
          Azure Blob Storage Settings
        </CardTitle>
        <CardDescription>
          Instagram görselleri için Blob depolama. Bağlantı dizesi yalnızca sunucuda şifreli saklanır.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!settings.encryptionConfigured ? (
          <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            Veritabanına bağlantı dizesi kaydetmek için SETTINGS_ENCRYPTION_KEY gerekir. Alternatif
            olarak sunucuda AZURE_STORAGE_CONNECTION_STRING tanımlayabilirsiniz.
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="blob-active">Etkin</Label>
            <p className="text-xs text-muted-foreground">
              Kapalıyken Blob yüklemesi ve Zapier gönderimi yapılamaz.
            </p>
          </div>
          <Switch id="blob-active" checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="blob-public-urls">Public Blob URL</Label>
            <p className="text-xs text-muted-foreground">
              Zapier için HTTPS public URL üretimi.
            </p>
          </div>
          <Switch
            id="blob-public-urls"
            checked={enablePublicUrls}
            onCheckedChange={setEnablePublicUrls}
          />
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="blob-account">Storage Account Name</Label>
            <Input
              id="blob-account"
              value={storageAccountName}
              onChange={(e) => setStorageAccountName(e.target.value)}
              placeholder="mystorageaccount"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="blob-container">Container Name</Label>
            <Input
              id="blob-container"
              value={containerName}
              onChange={(e) => setContainerName(e.target.value)}
              placeholder="instagram-assets"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="blob-public-base">Public Base URL (isteğe bağlı)</Label>
          <Input
            id="blob-public-base"
            type="url"
            value={publicBaseUrl}
            onChange={(e) => setPublicBaseUrl(e.target.value)}
            placeholder="https://account.blob.core.windows.net/instagram-assets"
          />
          <p className="text-xs text-muted-foreground">
            Boş bırakılırsa https://&lt;account&gt;.blob.core.windows.net/&lt;container&gt;/…
            üretilir.
          </p>
        </div>

        <div className="space-y-3">
          <Label htmlFor="blob-connection">Connection String</Label>
          {settings.connectionStringMasked ? (
            <p className="text-xs font-mono text-muted-foreground break-all">
              {settings.connectionStringMasked}
            </p>
          ) : null}
          {settings.hasEnvConnectionString ? (
            <p className="text-xs text-muted-foreground">
              Sunucuda AZURE_STORAGE_CONNECTION_STRING tanımlı (değer gösterilmez).
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <Switch
              id="blob-update-cs"
              checked={updateConnectionString}
              onCheckedChange={setUpdateConnectionString}
              disabled={!settings.encryptionConfigured}
            />
            <Label htmlFor="blob-update-cs" className="font-normal">
              Bağlantı dizesi güncelle
            </Label>
          </div>
          {updateConnectionString ? (
            <Input
              id="blob-connection"
              type="password"
              autoComplete="off"
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
              placeholder="DefaultEndpointsProtocol=https;AccountName=..."
            />
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="blob-test-url">Public URL test (isteğe bağlı)</Label>
          <Input
            id="blob-test-url"
            type="url"
            value={testPublicUrl}
            onChange={(e) => setTestPublicUrl(e.target.value)}
            placeholder="https://account.blob.core.windows.net/instagram-assets/..."
          />
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
          <Button type="button" onClick={handleSave} disabled={busy}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </Button>
          <Button type="button" variant="outline" onClick={handleTestConnection} disabled={busy}>
            {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
            Bağlantıyı Test Et
          </Button>
          <Button type="button" variant="outline" onClick={handleCreateContainer} disabled={busy}>
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderPlus className="h-4 w-4" />
            )}
            Konteyner Oluştur
          </Button>
          <Button type="button" variant="outline" onClick={handleTestPublicUrl} disabled={busy}>
            {isTestingUrl ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Globe className="h-4 w-4" />
            )}
            Public URL Test
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
