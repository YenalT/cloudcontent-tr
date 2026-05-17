import Link from "next/link"

import { PageHeader } from "@/components/shared/page-header"
import { AzureDocumentIntelligenceSettingsForm } from "@/components/settings/azure-document-intelligence-settings-form"
import { AzureOpenAiSettingsForm } from "@/components/settings/azure-openai-settings-form"
import { OpenAiImageSettingsForm } from "@/components/settings/openai-image-settings-form"
import { ZapierSettingsForm } from "@/components/settings/zapier-settings-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { brand } from "@/lib/brand"
import { EncryptionStatusBanner } from "@/components/settings/encryption-status-banner"
import { getAzureOpenAiSettingsPublic } from "@/lib/data/ai-provider-config"
import { getAzureDocumentIntelligenceSettingsPublic } from "@/lib/data/document-extraction-config"
import { getOpenAiImageSettingsPublic } from "@/lib/data/image-provider-config"
import { getStorageProviderSettingsPublic } from "@/lib/data/storage-provider-config"
import { getZapierSettingsPublic } from "@/lib/data/zapier-config"
import { AzureBlobSettingsForm } from "@/components/settings/azure-blob-settings-form"
import { getSettingsEncryptionKeyStatus } from "@/lib/env/settings-encryption"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const encryptionStatus = getSettingsEncryptionKeyStatus()
  const [azureSettings, documentSettings, openAiImageSettings, zapierSettings, blobSettings] =
    await Promise.all([
      getAzureOpenAiSettingsPublic(),
      getAzureDocumentIntelligenceSettingsPublic(),
      getOpenAiImageSettingsPublic(),
      getZapierSettingsPublic(),
      getStorageProviderSettingsPublic(),
    ])

  return (
    <>
      <PageHeader title="Ayarlar" description="Platform ve AI entegrasyon yapılandırması" />
      <div className="grid max-w-3xl gap-6 p-4 md:p-6">
        <EncryptionStatusBanner status={encryptionStatus} />
        <AzureOpenAiSettingsForm settings={azureSettings} />
        <OpenAiImageSettingsForm settings={openAiImageSettings} />
        <AzureBlobSettingsForm settings={blobSettings} />
        <ZapierSettingsForm settings={zapierSettings} />
        <AzureDocumentIntelligenceSettingsForm settings={documentSettings} />

        <Card>
          <CardHeader>
            <CardTitle>Genel</CardTitle>
            <CardDescription>Site bilgileri (yakında veritabanına bağlanacak)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site-name">Site adı</Label>
              <Input id="site-name" defaultValue={brand.name} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-url">Site URL</Label>
              <Input id="site-url" defaultValue={brand.siteUrl} disabled />
            </div>
            <Button disabled>Kaydet</Button>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          API kullanım logları için{" "}
          <Link href="/logs" className="text-primary underline">
            İş Günlükleri
          </Link>{" "}
          sayfasını ve veritabanındaki <code>api_usage_logs</code> tablosunu inceleyin.
        </p>
      </div>
    </>
  )
}
