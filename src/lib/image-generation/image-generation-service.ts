import { ImageGenerationProvider } from "@prisma/client"

import { AiConfigurationError } from "@/lib/ai/errors"
import { getActiveImageGenerationProvider } from "@/lib/data/image-provider-config"
import { OpenAiImageGenerationService } from "@/lib/image-generation/openai-image-generator"
import { PlaceholderImageGenerationService } from "@/lib/image-generation/placeholder-image-generator"
import type { ImageGenerationService } from "@/lib/image-generation/types"

let cached: ImageGenerationService | null = null
let cachedProvider: ImageGenerationProvider | null = null

export function clearImageGenerationServiceCache() {
  cached = null
  cachedProvider = null
}

export async function getImageGenerationService(): Promise<ImageGenerationService> {
  const active = await getActiveImageGenerationProvider()

  if (!active) {
    throw new AiConfigurationError(
      "Aktif görüntü üretim sağlayıcısı yok. Ayarlar → OpenAI Görüntü Üretimi bölümünden etkinleştirin."
    )
  }

  if (cached && cachedProvider === active) {
    return cached
  }

  if (active === ImageGenerationProvider.MOCK) {
    cached = new PlaceholderImageGenerationService()
    cachedProvider = active
    return cached
  }

  if (active === ImageGenerationProvider.OPENAI) {
    cached = new OpenAiImageGenerationService()
    cachedProvider = active
    return cached
  }

  throw new AiConfigurationError(`Desteklenmeyen görüntü sağlayıcısı: ${active}`)
}
