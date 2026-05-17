import "server-only"

import { ImageProcessingError } from "@/lib/image-processing/image-processing-errors"

const MIN_IMAGE_BYTES = 100

/** Decode OpenAI / API base64 image payloads without corrupting binary data. */
export function decodeBase64Image(encoded: string): Buffer {
  let cleaned = encoded.trim()

  const dataUrlMatch = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/i.exec(cleaned)
  if (dataUrlMatch) {
    cleaned = dataUrlMatch[1] ?? cleaned
  }

  cleaned = cleaned.replace(/\s/g, "")

  if (!cleaned || cleaned.length < 4) {
    throw new ImageProcessingError("Base64 görüntü verisi boş veya çok kısa.")
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(cleaned, "base64")
  } catch {
    throw new ImageProcessingError("Base64 görüntü verisi çözülemedi.")
  }

  if (buffer.length < MIN_IMAGE_BYTES) {
    throw new ImageProcessingError(
      `Görüntü buffer çok küçük (${buffer.length} bayt). Base64 çözümü başarısız olabilir.`
    )
  }

  return buffer
}
