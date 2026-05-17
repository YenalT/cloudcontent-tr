import { ApiUsageStatus } from "@prisma/client"

import { OpenAiImageError } from "@/lib/ai/errors"
import { throwOpenAiImageFromResponse, type OpenAiErrorBody } from "@/lib/ai/openai-image-error-utils"
import type {
  OpenAiImageGenerationResult,
  OpenAiImageOutputFormat,
  OpenAiImageQuality,
  OpenAiImageRuntimeConfig,
  OpenAiImageSize,
} from "@/lib/ai/openai-image-types"
import { decodeBase64Image } from "@/lib/image-processing/decode-base64-image"
import { assertSupportedImageBuffer } from "@/lib/image-processing/detect-image-mime"
import { assertAsciiApiKeyHeaderValue } from "@/lib/http/header-utils"
import { prisma } from "@/lib/prisma"

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations"
const OPENAI_MODELS_URL = "https://api.openai.com/v1/models"

export type GenerateOpenAiImageInput = {
  prompt: string
  size: OpenAiImageSize
  purpose: string
  variant: string
}

function mimeFromOutputFormat(format: OpenAiImageOutputFormat): string {
  if (format === "jpeg") return "image/jpeg"
  if (format === "webp") return "image/webp"
  return "image/png"
}

function fileExtensionFromFormat(format: OpenAiImageOutputFormat): string {
  return format === "jpeg" ? "jpg" : format
}

type OpenAiImageDataItem = {
  b64_json?: string
  url?: string
  revised_prompt?: string
}

async function downloadImageFromUrl(url: string, timeoutMs: number): Promise<Buffer> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: "image/*" },
  })
  if (!response.ok) {
    throw new OpenAiImageError(`OpenAI görüntü URL indirilemedi (HTTP ${response.status}).`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  assertSupportedImageBuffer(buffer)
  return buffer
}

async function resolveImageBufferFromResponse(
  item: OpenAiImageDataItem | undefined,
  timeoutMs: number
): Promise<Buffer> {
  if (item?.b64_json) {
    const buffer = decodeBase64Image(item.b64_json)
    assertSupportedImageBuffer(buffer)
    return buffer
  }

  if (item?.url) {
    return downloadImageFromUrl(item.url, timeoutMs)
  }

  throw new OpenAiImageError("OpenAI görüntü yanıtı boş veya geçersiz (b64_json / url yok).")
}

export class OpenAiImageClient {
  constructor(private readonly config: OpenAiImageRuntimeConfig) {}

  async generateImage(input: GenerateOpenAiImageInput): Promise<OpenAiImageGenerationResult> {
    const started = Date.now()
    let status: ApiUsageStatus = ApiUsageStatus.FAILED
    let errorMessage: string | undefined
    let errorLogMetadata: Record<string, unknown> | undefined

    try {
      const apiKey = assertAsciiApiKeyHeaderValue(this.config.apiKey, "OpenAI API key")

      const response = await fetch(OPENAI_IMAGES_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.model,
          prompt: input.prompt,
          size: input.size,
          quality: this.config.quality,
          output_format: this.config.outputFormat,
          n: 1,
        }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      })

      const body = (await response.json().catch(() => null)) as
        | (OpenAiErrorBody & { data?: OpenAiImageDataItem[] })
        | null

      if (!response.ok) {
        throwOpenAiImageFromResponse(response.status, body)
      }

      const item = body?.data?.[0]
      const rawBuffer = await resolveImageBufferFromResponse(item, this.config.timeoutMs)
      const detected = assertSupportedImageBuffer(rawBuffer)

      status = ApiUsageStatus.SUCCESS
      return {
        buffer: rawBuffer,
        mimeType: detected.mimeType,
        declaredMimeType: mimeFromOutputFormat(this.config.outputFormat),
        revisedPrompt: item?.revised_prompt,
      }
    } catch (error) {
      if (error instanceof OpenAiImageError) {
        errorMessage = error.message
        errorLogMetadata = error.logMetadata
        throw error
      }
      if (error instanceof Error && error.name === "TimeoutError") {
        errorMessage = `OpenAI görüntü isteği zaman aşımına uğradı (${this.config.timeoutMs}ms).`
        throw new OpenAiImageError(errorMessage)
      }
      errorMessage =
        error instanceof Error ? error.message : "OpenAI görüntü isteği başarısız."
      throw new OpenAiImageError(errorMessage)
    } finally {
      const durationMs = Date.now() - started
      await prisma.apiUsageLog
        .create({
          data: {
            provider: "openai-images",
            endpoint: "/v1/images/generations",
            model: this.config.model,
            status,
            metadata: {
              purpose: input.purpose,
              variant: input.variant,
              size: input.size,
              quality: this.config.quality,
              outputFormat: this.config.outputFormat,
              durationMs,
              error: errorMessage,
              ...errorLogMetadata,
            },
          },
        })
        .catch(() => null)
    }
  }

  getFileExtension(): string {
    return fileExtensionFromFormat(this.config.outputFormat)
  }
}

export async function testOpenAiImageConnection(
  config: OpenAiImageRuntimeConfig
): Promise<{ ok: true; message: string; latencyMs: number }> {
  const started = Date.now()
  const apiKey = assertAsciiApiKeyHeaderValue(config.apiKey, "OpenAI API key")

  const response = await fetch(OPENAI_MODELS_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(config.timeoutMs),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as OpenAiErrorBody | null
    throwOpenAiImageFromResponse(response.status, body)
  }

  return {
    ok: true,
    message: "OpenAI API bağlantısı başarılı.",
    latencyMs: Date.now() - started,
  }
}
