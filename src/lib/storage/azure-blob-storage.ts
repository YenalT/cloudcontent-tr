import { AzureDocumentBlobStorageService } from "@/lib/storage/azure-document-blob-storage"
import type { StorageService, StoredFile, UploadFileInput } from "@/lib/storage/types"

/**
 * Azure Blob Storage for document uploads (PDF/DOCX/PPTX).
 * Uses container from AZURE_DOCUMENTS_CONTAINER_NAME (default: documents).
 */
export class AzureBlobStorageService implements StorageService {
  readonly provider = "azure"
  private readonly delegate = new AzureDocumentBlobStorageService()

  upload(input: UploadFileInput): Promise<StoredFile> {
    return this.delegate.upload(input)
  }

  delete(storageKey: string): Promise<void> {
    return this.delegate.delete(storageKey)
  }

  getPublicUrl(storageKey: string): string {
    return this.delegate.getPublicUrl(storageKey)
  }
}

export { AzureDocumentBlobStorageService }
