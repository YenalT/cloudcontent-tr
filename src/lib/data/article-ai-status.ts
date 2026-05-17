import { AiProvider } from "@prisma/client"

import { getActiveProvider, getAzureOpenAiSettingsPublic } from "@/lib/data/ai-provider-config"

export async function getArticleAiStatus() {
  const [active, azure] = await Promise.all([
    getActiveProvider(),
    getAzureOpenAiSettingsPublic(),
  ])

  if (!active) {
    return {
      ready: false,
      message:
        "Aktif AI sağlayıcısı yok. Ayarlar sayfasından Azure OpenAI'yi yapılandırıp etkinleştirin.",
    }
  }

  if (active === AiProvider.AZURE_OPENAI) {
    if (!azure.encryptionConfigured) {
      return {
        ready: false,
        message:
          "SETTINGS_ENCRYPTION_KEY tanımlı değil. Sunucu yöneticisi .env dosyasına eklemelidir.",
      }
    }
    if (!azure.endpoint || !azure.deploymentName || !azure.hasApiKey) {
      return {
        ready: false,
        message:
          "Azure OpenAI yapılandırması eksik. Endpoint, deployment ve API anahtarını Ayarlar'dan tamamlayın.",
      }
    }
    if (!azure.isActive) {
      return {
        ready: false,
        message: "Azure OpenAI kayıtlı ancak pasif. Ayarlar'dan 'Sağlayıcı aktif' seçeneğini açın.",
      }
    }
  }

  return {
    ready: true,
    provider: active,
    message:
      active === AiProvider.AZURE_OPENAI
        ? "Azure OpenAI ile makale üretimi hazır."
        : "Mock AI ile makale üretimi (geliştirme).",
  }
}
