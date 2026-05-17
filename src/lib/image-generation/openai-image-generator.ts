import { JobStatus } from "@prisma/client"

import { OpenAiImageClient } from "@/lib/ai/openai-image-client"
import type { OpenAiImageSize } from "@/lib/ai/openai-image-types"
import { resolveOpenAiImageRuntimeConfig } from "@/lib/data/image-provider-config"
import {
  prepareImageForInstagramUpload,
  toSafeImageDiagnostics,
} from "@/lib/image-processing/prepare-image-upload"
import type {
  GeneratedVisualAsset,
  ImageGenerationInput,
  ImageGenerationService,
} from "@/lib/image-generation/types"
import { prisma } from "@/lib/prisma"

function openAiSizeFromDimensions(width: number, height: number): OpenAiImageSize {
  if (width === 1024 && height === 1536) return "1024x1536"
  if (width === 1536 && height === 1024) return "1536x1024"
  return "1024x1024"
}

function assetKeyFromInput(input: ImageGenerationInput): string {
  if (input.variant === "carousel") {
    return `carousel-${input.slideIndex ?? 0}`
  }
  return input.variant
}

export class OpenAiImageGenerationService implements ImageGenerationService {
  async generate(input: ImageGenerationInput): Promise<GeneratedVisualAsset> {
    const config = await resolveOpenAiImageRuntimeConfig()
    const client = new OpenAiImageClient(config)
    const size = openAiSizeFromDimensions(input.dimensions.width, input.dimensions.height)
    const assetKey = assetKeyFromInput(input)

    const result = await client.generateImage({
      prompt: input.prompt,
      size,
      purpose: "instagram_visual",
      variant:
        input.variant === "carousel"
          ? `carousel-${(input.slideIndex ?? 0) + 1}`
          : input.variant,
    })

    const prepared = await prepareImageForInstagramUpload({
      buffer: result.buffer,
      assetKey,
    })

    const diagnostics = toSafeImageDiagnostics(prepared)

    await prisma.jobLog
      .create({
        data: {
          type: "instagram_image_generated",
          status: JobStatus.SUCCESS,
          message: `Görüntü üretildi: ${assetKey}`,
          metadata: {
            assetKey,
            declaredFormat: config.outputFormat,
            detectedSourceMime: diagnostics.detectedMimeType,
            outputMime: diagnostics.mimeType,
            originalWidth: diagnostics.originalWidth,
            originalHeight: diagnostics.originalHeight,
            originalFileSizeBytes: diagnostics.originalFileSizeBytes,
            finalWidth: diagnostics.width,
            finalHeight: diagnostics.height,
            optimizedFileSizeBytes: diagnostics.fileSizeBytes,
            processingDurationMs: diagnostics.processingDurationMs,
          },
        },
      })
      .catch(() => null)

    return {
      buffer: prepared.buffer,
      mimeType: prepared.mimeType,
      fileName: prepared.fileName,
      width: prepared.width,
      height: prepared.height,
      fileSizeBytes: prepared.fileSizeBytes,
      detectedMimeType: prepared.detectedMimeType,
    }
  }
}
