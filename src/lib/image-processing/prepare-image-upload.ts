import "server-only"

import {
  normalizeImageForInstagram,
  normalizationLogFields,
} from "@/lib/image-processing/normalize-instagram-image"
import type { NormalizeInstagramImageOptions } from "@/lib/image-processing/normalize-instagram-image"
import {
  INSTAGRAM_POST_OUTPUT_HEIGHT,
  INSTAGRAM_POST_OUTPUT_WIDTH,
} from "@/lib/image-processing/instagram-post-spec"

export type PreparedImageUpload = {
  buffer: Buffer
  mimeType: "image/jpeg"
  fileName: string
  width: number
  height: number
  fileSizeBytes: number
  detectedMimeType: string
  originalWidth: number
  originalHeight: number
  originalFileSizeBytes: number
  processingDurationMs: number
}

function optionsForAssetKey(assetKey: string): NormalizeInstagramImageOptions {
  if (assetKey === "post") {
    return {
      targetWidth: INSTAGRAM_POST_OUTPUT_WIDTH,
      targetHeight: INSTAGRAM_POST_OUTPUT_HEIGHT,
      fit: "cover",
      quality: 88,
    }
  }
  return {
    targetWidth: INSTAGRAM_POST_OUTPUT_WIDTH,
    targetHeight: INSTAGRAM_POST_OUTPUT_HEIGHT,
    fit: "inside",
    quality: 88,
  }
}

export async function prepareImageForInstagramUpload(params: {
  buffer: Buffer
  assetKey: string
  declaredFileName?: string
  options?: NormalizeInstagramImageOptions
}): Promise<PreparedImageUpload> {
  const originalFileSizeBytes = params.buffer.length
  const normalized = await normalizeImageForInstagram(
    params.buffer,
    params.options ?? optionsForAssetKey(params.assetKey)
  )

  const suffix =
    params.assetKey === "post"
      ? "post"
      : params.assetKey === "story"
        ? "story"
        : params.assetKey.startsWith("carousel-")
          ? `carousel-slide-${Number(params.assetKey.replace("carousel-", "")) + 1}`
          : params.assetKey

  return {
    buffer: normalized.buffer,
    mimeType: normalized.mimeType,
    fileName: `${suffix}.jpg`,
    width: normalized.width,
    height: normalized.height,
    fileSizeBytes: normalized.fileSizeBytes,
    detectedMimeType: normalized.detectedSourceMime,
    originalWidth: normalized.originalWidth,
    originalHeight: normalized.originalHeight,
    originalFileSizeBytes,
    processingDurationMs: normalized.processingDurationMs,
  }
}

export type SafeImageDiagnostics = {
  mimeType: string
  detectedMimeType: string
  fileSizeBytes: number
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  originalFileSizeBytes: number
  processingDurationMs: number
}

export function toSafeImageDiagnostics(prepared: PreparedImageUpload): SafeImageDiagnostics {
  return {
    mimeType: prepared.mimeType,
    detectedMimeType: prepared.detectedMimeType,
    fileSizeBytes: prepared.fileSizeBytes,
    width: prepared.width,
    height: prepared.height,
    originalWidth: prepared.originalWidth,
    originalHeight: prepared.originalHeight,
    originalFileSizeBytes: prepared.originalFileSizeBytes,
    processingDurationMs: prepared.processingDurationMs,
  }
}

export function toProcessingLogMetadata(prepared: PreparedImageUpload) {
  return normalizationLogFields(
    {
      buffer: prepared.buffer,
      mimeType: prepared.mimeType,
      extension: "jpg",
      width: prepared.width,
      height: prepared.height,
      fileSizeBytes: prepared.fileSizeBytes,
      detectedSourceMime: prepared.detectedMimeType,
      originalWidth: prepared.originalWidth,
      originalHeight: prepared.originalHeight,
      processingDurationMs: prepared.processingDurationMs,
    },
    prepared.originalFileSizeBytes
  )
}
