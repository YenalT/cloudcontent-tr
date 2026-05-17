export type OpenAiImageQuality = "low" | "medium" | "high" | "auto"
export type OpenAiImageOutputFormat = "png" | "jpeg" | "webp"
export type OpenAiImageSize = "1024x1024" | "1024x1536" | "1536x1024" | "auto"

export type OpenAiImageRuntimeConfig = {
  apiKey: string
  model: string
  quality: OpenAiImageQuality
  outputFormat: OpenAiImageOutputFormat
  timeoutMs: number
}

export type OpenAiImageGenerationResult = {
  buffer: Buffer
  /** MIME detected from actual image bytes */
  mimeType: string
  /** MIME requested via OpenAI output_format */
  declaredMimeType: string
  revisedPrompt?: string
}
