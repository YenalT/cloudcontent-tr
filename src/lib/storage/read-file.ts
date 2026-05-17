import { AzureDocumentBlobStorageService } from "@/lib/storage/azure-document-blob-storage"
import { getLocalStorageService, getStorageService } from "@/lib/storage"
import { readFile } from "fs/promises"

export async function readStoredFile(storageKey: string): Promise<Buffer> {
  const local = getLocalStorageService()
  if (local) {
    return readFile(local.resolvePath(storageKey))
  }

  const service = getStorageService()
  if (service.provider === "azure") {
    return new AzureDocumentBlobStorageService().download(storageKey)
  }

  throw new Error(
    "Dosya okunamadı: Azure Blob veya yerel depolama yapılandırın (STORAGE_PROVIDER)."
  )
}
