import "server-only"

import sharp from "sharp"

import { assertSupportedImageBuffer, isSvgOrTextBuffer } from "@/lib/image-processing/detect-image-mime"
import { ImageProcessingError } from "@/lib/image-processing/image-processing-errors"
import {
  INSTAGRAM_POST_HARD_MAX_BYTES,
  INSTAGRAM_POST_MIME,
  INSTAGRAM_POST_OUTPUT_HEIGHT,
  INSTAGRAM_POST_OUTPUT_WIDTH,
  INSTAGRAM_POST_PREFERRED_MAX_BYTES,
} from "@/lib/image-processing/instagram-post-spec"

export type NormalizedInstagramImage = {
  buffer: Buffer
  mimeType: "image/jpeg"
  extension: "jpg"
  width: number
  height: number
  fileSizeBytes: number
  detectedSourceMime: string
  originalWidth: number
  originalHeight: number
  processingDurationMs: number
}

export type NormalizeInstagramImageOptions = {
  /** Exact output width (default: 1080 for square post). */
  targetWidth?: number
  /** Exact output height (default: 1080 for square post). */
  targetHeight?: number
  /** Resize strategy when target dimensions are set. */
  fit?: "cover" | "inside"
  /** JPEG quality starting point (default 88). */
  quality?: number
}

const JPEG_BASE: sharp.JpegOptions = {
  mozjpeg: true,
  chromaSubsampling: "4:2:0",
  progressive: false,
  force: true,
}

async function encodeJpeg(
  pipeline: sharp.Sharp,
  quality: number
): Promise<{ data: Buffer; info: sharp.OutputInfo }> {
  const { data, info } = await pipeline
    .jpeg({ ...JPEG_BASE, quality })
    .toBuffer({ resolveWithObject: true })
  return { data, info }
}

async function compressToTargetSize(
  pipeline: sharp.Sharp,
  startQuality: number
): Promise<{ data: Buffer; info: sharp.OutputInfo; quality: number }> {
  const qualities = [startQuality, 85, 80, 75, 70, 65]
  const unique = [...new Set(qualities)]

  let last: { data: Buffer; info: sharp.OutputInfo; quality: number } | null = null

  for (const quality of unique) {
    const { data, info } = await encodeJpeg(pipeline.clone(), quality)
    last = { data, info, quality }
    if (data.length <= INSTAGRAM_POST_PREFERRED_MAX_BYTES) {
      return last
    }
  }

  if (!last || last.data.length > INSTAGRAM_POST_HARD_MAX_BYTES) {
    const sizeKb = last ? Math.round(last.data.length / 1024) : 0
    throw new ImageProcessingError(
      `Görüntü Instagram boyut sınırını aşıyor (${sizeKb} KB). Daha sade bir görsel deneyin.`,
      "file_too_large"
    )
  }

  return last
}

/**
 * Validates binary image data and normalizes to baseline JPEG (sRGB, no alpha)
 * sized for Instagram feed posts (1080×1080 by default).
 */
export async function normalizeImageForInstagram(
  input: Buffer,
  options?: NormalizeInstagramImageOptions
): Promise<NormalizedInstagramImage> {
  const started = Date.now()

  if (isSvgOrTextBuffer(input)) {
    throw new ImageProcessingError(
      "SVG veya metin tabanlı placeholder Instagram için desteklenmez. OpenAI görüntü üretimini etkinleştirin.",
      "unsupported_svg"
    )
  }

  const detected = assertSupportedImageBuffer(input)
  const originalFileSizeBytes = input.length

  const targetWidth = options?.targetWidth ?? INSTAGRAM_POST_OUTPUT_WIDTH
  const targetHeight = options?.targetHeight ?? INSTAGRAM_POST_OUTPUT_HEIGHT
  const fit = options?.fit ?? "cover"
  const startQuality = options?.quality ?? 88

  try {
    const meta = await sharp(input, { failOn: "error" }).metadata()
    const sourceWidth = meta.width ?? 0
    const sourceHeight = meta.height ?? 0

    if (sourceWidth < 1 || sourceHeight < 1) {
      throw new ImageProcessingError("Görüntü boyutları okunamadı.")
    }

    let pipeline = sharp(input, { failOn: "error" }).rotate().toColorspace("srgb")

    if (meta.hasAlpha) {
      pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } })
    }

    pipeline = pipeline.resize({
      width: targetWidth,
      height: targetHeight,
      fit,
      position: "centre",
      withoutEnlargement: false,
    })

    const { data, info, quality } = await compressToTargetSize(pipeline, startQuality)

    if (data[0] !== 0xff || data[1] !== 0xd8) {
      throw new ImageProcessingError("JPEG normalizasyonu başarısız.")
    }

    assertSupportedImageBuffer(data)

    if (info.width !== targetWidth || info.height !== targetHeight) {
      throw new ImageProcessingError(
        `Çıktı boyutu ${info.width}×${info.height}; beklenen ${targetWidth}×${targetHeight}.`
      )
    }

    const processingDurationMs = Date.now() - started

    return {
      buffer: data,
      mimeType: INSTAGRAM_POST_MIME,
      extension: "jpg",
      width: info.width,
      height: info.height,
      fileSizeBytes: data.length,
      detectedSourceMime: detected.mimeType,
      originalWidth: sourceWidth,
      originalHeight: sourceHeight,
      processingDurationMs,
    }
  } catch (error) {
    if (error instanceof ImageProcessingError) throw error
    throw new ImageProcessingError(
      error instanceof Error ? error.message : "Görüntü normalizasyonu başarısız."
    )
  }
}

/** @internal for logging metadata */
export function normalizationLogFields(result: NormalizedInstagramImage, originalBytes: number) {
  return {
    originalWidth: result.originalWidth,
    originalHeight: result.originalHeight,
    originalFileSizeBytes: originalBytes,
    finalWidth: result.width,
    finalHeight: result.height,
    optimizedFileSizeBytes: result.fileSizeBytes,
    mimeType: result.mimeType,
    detectedSourceMime: result.detectedSourceMime,
    processingDurationMs: result.processingDurationMs,
    jpegQualityNote: "adaptive",
  }
}
