export type ImageDimensions = {
  width: number
  height: number
}

/** OpenAI gpt-image-1 sizes for Instagram feed post and carousel */
export const INSTAGRAM_POST_SIZE: ImageDimensions = { width: 1024, height: 1024 }
/** OpenAI gpt-image-1 portrait size for Instagram story */
export const INSTAGRAM_STORY_SIZE: ImageDimensions = { width: 1024, height: 1536 }
export const INSTAGRAM_CAROUSEL_SIZE: ImageDimensions = { width: 1024, height: 1024 }

export type GeneratedVisualAsset = {
  buffer: Buffer
  mimeType: string
  fileName: string
  width: number
  height: number
  fileSizeBytes: number
  detectedMimeType: string
}

export type ImageGenerationInput = {
  prompt: string
  label: string
  dimensions: ImageDimensions
  variant: "post" | "story" | "carousel"
  slideIndex?: number
}

export interface ImageGenerationService {
  generate(input: ImageGenerationInput): Promise<GeneratedVisualAsset>
}
