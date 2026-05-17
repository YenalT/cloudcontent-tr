import "server-only"

import { ImageProcessingError } from "@/lib/image-processing/image-processing-errors"

export type DetectedImageFormat = {
  mimeType: "image/jpeg" | "image/png" | "image/webp"
  extension: "jpg" | "png" | "webp"
}

const TEXT_SIGNATURES = [
  { prefix: "<!DOCTYPE", label: "HTML" },
  { prefix: "<html", label: "HTML" },
  { prefix: "<?xml", label: "XML" },
  { prefix: "{", label: "JSON" },
  { prefix: "[", label: "JSON" },
]

export function detectImageFormatFromBuffer(buffer: Buffer): DetectedImageFormat | null {
  if (buffer.length < 12) return null

  const head = buffer.subarray(0, 32).toString("utf8").toLowerCase()
  for (const sig of TEXT_SIGNATURES) {
    if (head.startsWith(sig.prefix)) return null
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { mimeType: "image/png", extension: "png" }
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" }
  }

  // WEBP: RIFF....WEBP
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: "webp" }
  }

  return null
}

export function assertSupportedImageBuffer(buffer: Buffer): DetectedImageFormat {
  const detected = detectImageFormatFromBuffer(buffer)
  if (!detected) {
    const preview = buffer.subarray(0, 16).toString("hex")
    throw new ImageProcessingError(
      `Desteklenmeyen veya bozuk görüntü formatı (magic: ${preview}). Yalnızca JPEG, PNG veya WEBP kabul edilir.`
    )
  }
  return detected
}

export function isSvgOrTextBuffer(buffer: Buffer): boolean {
  const start = buffer.subarray(0, 256).toString("utf8").trimStart().toLowerCase()
  return start.startsWith("<?xml") || start.startsWith("<svg") || start.includes("<svg ")
}
