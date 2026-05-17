export class ImageProcessingError extends Error {
  readonly code: string

  constructor(message: string, code = "image_processing_error") {
    super(message)
    this.name = "ImageProcessingError"
    this.code = code
  }
}
