import "server-only"

import {
  INSTAGRAM_POST_HARD_MAX_BYTES,
  INSTAGRAM_POST_MIME,
  INSTAGRAM_POST_OUTPUT_HEIGHT,
  INSTAGRAM_POST_OUTPUT_WIDTH,
  INSTAGRAM_POST_PREFERRED_MAX_BYTES,
} from "@/lib/image-processing/instagram-post-spec"

export type InstagramPostCompatibilityInput = {
  width: number | null | undefined
  height: number | null | undefined
  mimeType: string | null | undefined
  fileSizeBytes: number | null | undefined
  blobValidationOk?: boolean | null
  publicUrl?: string | null
}

export type InstagramPostCompatibility = {
  ok: boolean
  status: "compatible" | "warning" | "incompatible"
  label: string
  issues: string[]
  suggestions: string[]
}

export function assessInstagramPostCompatibility(
  input: InstagramPostCompatibilityInput
): InstagramPostCompatibility {
  const issues: string[] = []
  const suggestions: string[] = []

  const w = input.width ?? 0
  const h = input.height ?? 0
  const mime = (input.mimeType ?? "").toLowerCase()
  const bytes = input.fileSizeBytes ?? 0

  if (w !== INSTAGRAM_POST_OUTPUT_WIDTH || h !== INSTAGRAM_POST_OUTPUT_HEIGHT) {
    issues.push(
      `Boyut ${w || "?"}×${h || "?"} — Instagram için ${INSTAGRAM_POST_OUTPUT_WIDTH}×${INSTAGRAM_POST_OUTPUT_HEIGHT} gerekli.`
    )
    suggestions.push("«Instagram için Optimize Et» ile görseli yeniden işleyin.")
  }

  if (mime && mime !== INSTAGRAM_POST_MIME) {
    issues.push(`MIME türü ${mime}; beklenen ${INSTAGRAM_POST_MIME}.`)
    suggestions.push("Görseli JPEG olarak yeniden işleyin.")
  }

  if (bytes > INSTAGRAM_POST_HARD_MAX_BYTES) {
    issues.push(`Dosya boyutu çok büyük (${Math.round(bytes / (1024 * 1024))} MB).`)
    suggestions.push("Görseli sıkıştırın veya yeniden üretin.")
  } else if (bytes > INSTAGRAM_POST_PREFERRED_MAX_BYTES) {
    issues.push(`Dosya boyutu ${Math.round(bytes / (1024 * 1024))} MB — 5 MB altı önerilir.`)
    suggestions.push("«Instagram için Optimize Et» ile sıkıştırmayı deneyin.")
  }

  if (input.publicUrl && !input.publicUrl.startsWith("https://")) {
    issues.push("Public URL HTTPS değil.")
  }

  if (input.blobValidationOk === false) {
    issues.push("Blob URL doğrulaması başarısız.")
    suggestions.push("Görseli Blob'a yeniden yükleyin.")
  }

  if (issues.length === 0) {
    return {
      ok: true,
      status: "compatible",
      label: "Instagram uyumlu",
      issues: [],
      suggestions: [],
    }
  }

  const hasHardFailure =
    w !== INSTAGRAM_POST_OUTPUT_WIDTH ||
    h !== INSTAGRAM_POST_OUTPUT_HEIGHT ||
    (mime && mime !== INSTAGRAM_POST_MIME) ||
    bytes > INSTAGRAM_POST_HARD_MAX_BYTES ||
    input.blobValidationOk === false

  return {
    ok: false,
    status: hasHardFailure ? "incompatible" : "warning",
    label: hasHardFailure ? "Uyumsuz" : "Uyarı",
    issues,
    suggestions: [...new Set(suggestions)],
  }
}

export function validateInstagramPostImageBuffer(meta: {
  width: number
  height: number
  mimeType: string
  fileSizeBytes: number
}): string[] {
  return assessInstagramPostCompatibility(meta).issues
}
