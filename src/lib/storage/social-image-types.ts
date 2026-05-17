export type SocialImageUploadInput = {
  buffer: Buffer
  fileName: string
  mimeType: string
  postId: string
  assetKey: string
}

export type StoredSocialImage = {
  storageKey: string
  publicUrl: string
  provider: string
  mimeType: string
  uploadedAt: Date
  width?: number
  height?: number
  fileSizeBytes?: number
  detectedMimeType?: string
  blobValidationOk?: boolean
  blobValidationMessage?: string | null
}

export interface SocialImageStorageService {
  readonly provider: string
  upload(input: SocialImageUploadInput): Promise<StoredSocialImage>
  delete(storageKey: string): Promise<void>
  getPublicUrl(storageKey: string): string
}
