export type StoredFile = {
  storageKey: string
  publicUrl: string
}

export type UploadFileInput = {
  buffer: Buffer
  fileName: string
  mimeType: string
  documentId: string
}

export interface StorageService {
  /** Provider identifier (e.g. local, azure) */
  readonly provider: string

  /** Persist binary content and return storage key + URL for DB */
  upload(input: UploadFileInput): Promise<StoredFile>

  /** Remove file from storage */
  delete(storageKey: string): Promise<void>

  /** Resolve a readable URL (may be API route or blob SAS URL) */
  getPublicUrl(storageKey: string): string
}
