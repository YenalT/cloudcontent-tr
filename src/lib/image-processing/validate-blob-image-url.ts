import "server-only"

import sharp from "sharp"

import { assertSupportedImageBuffer } from "@/lib/image-processing/detect-image-mime"
import { ImageProcessingError } from "@/lib/image-processing/image-processing-errors"
import {
  INSTAGRAM_POST_MIME,
  INSTAGRAM_POST_OUTPUT_HEIGHT,
  INSTAGRAM_POST_OUTPUT_WIDTH,
  INSTAGRAM_POST_HARD_MAX_BYTES,
} from "@/lib/image-processing/instagram-post-spec"

const FETCH_TIMEOUT_MS = 20_000
const MAX_FETCH_BYTES = 12 * 1024 * 1024

function isNonImageContentType(contentType: string): boolean {
  const ct = contentType.toLowerCase()
  return (
    ct.includes("text/html") ||
    ct.includes("text/xml") ||
    ct.includes("application/xml") ||
    ct.includes("application/json") ||
    ct.includes("text/plain") ||
    ct.startsWith("text/")
  )
}

export type BlobImageUrlValidation = {
  ok: boolean
  httpStatus: number
  contentType: string | null
  fileSizeBytes: number
  detectedMime: string | null
  width?: number
  height?: number
  message?: string
}

export type ValidateBlobImageUrlOptions = {
  /** Require exact 1080×1080 JPEG (Instagram post). */
  strictInstagramPost?: boolean
}

/** Fetch public Blob URL and verify it returns real image binary (not HTML/XML/JSON). */
export async function validateBlobImageUrl(
  url: string,
  options?: ValidateBlobImageUrlOptions
): Promise<BlobImageUrlValidation> {
  if (!url.startsWith("https://")) {
    return {
      ok: false,
      httpStatus: 0,
      contentType: null,
      fileSizeBytes: 0,
      detectedMime: null,
      message: "URL HTTPS olmalı.",
    }
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "image/jpeg, image/*" },
    })

    const httpStatus = response.status
    const contentType = response.headers.get("content-type")

    if (!response.ok) {
      return {
        ok: false,
        httpStatus,
        contentType,
        fileSizeBytes: 0,
        detectedMime: null,
        message: `Blob URL HTTP ${httpStatus} döndü.`,
      }
    }

    if (contentType && isNonImageContentType(contentType)) {
      return {
        ok: false,
        httpStatus,
        contentType,
        fileSizeBytes: 0,
        detectedMime: null,
        message: `Blob URL görsel değil (${contentType}).`,
      }
    }

    const arrayBuffer = await response.arrayBuffer()
    if (arrayBuffer.byteLength > MAX_FETCH_BYTES) {
      return {
        ok: false,
        httpStatus,
        contentType,
        fileSizeBytes: arrayBuffer.byteLength,
        detectedMime: null,
        message: "Görüntü dosyası çok büyük.",
      }
    }

    const buffer = Buffer.from(arrayBuffer)
    const detected = assertSupportedImageBuffer(buffer)

    let width: number | undefined
    let height: number | undefined

    if (options?.strictInstagramPost) {
      const meta = await sharp(buffer, { failOn: "error" }).metadata()
      width = meta.width
      height = meta.height

      if (detected.mimeType !== INSTAGRAM_POST_MIME) {
        return {
          ok: false,
          httpStatus,
          contentType,
          fileSizeBytes: buffer.length,
          detectedMime: detected.mimeType,
          width,
          height,
          message: `Beklenen MIME ${INSTAGRAM_POST_MIME}, alınan ${detected.mimeType}.`,
        }
      }

      if (width !== INSTAGRAM_POST_OUTPUT_WIDTH || height !== INSTAGRAM_POST_OUTPUT_HEIGHT) {
        return {
          ok: false,
          httpStatus,
          contentType,
          fileSizeBytes: buffer.length,
          detectedMime: detected.mimeType,
          width,
          height,
          message: `Görsel ${width}×${height}; Instagram gönderisi için ${INSTAGRAM_POST_OUTPUT_WIDTH}×${INSTAGRAM_POST_OUTPUT_HEIGHT} gerekli.`,
        }
      }

      if (buffer.length > INSTAGRAM_POST_HARD_MAX_BYTES) {
        return {
          ok: false,
          httpStatus,
          contentType,
          fileSizeBytes: buffer.length,
          detectedMime: detected.mimeType,
          width,
          height,
          message: "Görsel dosya boyutu Instagram sınırını aşıyor.",
        }
      }
    }

    return {
      ok: true,
      httpStatus,
      contentType: contentType ?? detected.mimeType,
      fileSizeBytes: buffer.length,
      detectedMime: detected.mimeType,
      width,
      height,
    }
  } catch (error) {
    const message =
      error instanceof ImageProcessingError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Blob URL doğrulanamadı."
    return {
      ok: false,
      httpStatus: 0,
      contentType: null,
      fileSizeBytes: 0,
      detectedMime: null,
      message,
    }
  }
}
