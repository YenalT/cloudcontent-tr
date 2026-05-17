import { mkdir, writeFile, unlink, rm } from "fs/promises"
import path from "path"

import type { StorageService, StoredFile, UploadFileInput } from "@/lib/storage/types"

function getUploadRoot() {
  return path.join(process.cwd(), process.env.LOCAL_UPLOAD_DIR ?? "storage/uploads")
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

export class LocalStorageService implements StorageService {
  readonly provider = "local"

  async upload(input: UploadFileInput): Promise<StoredFile> {
    const safeName = sanitizeFileName(input.fileName)
    const storageKey = `${input.documentId}/${safeName}`
    const absolutePath = path.join(getUploadRoot(), storageKey)

    await mkdir(path.dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, input.buffer)

    return {
      storageKey,
      publicUrl: `/api/files/${input.documentId}`,
    }
  }

  async delete(storageKey: string): Promise<void> {
    const absolutePath = path.join(getUploadRoot(), storageKey)
    try {
      await unlink(absolutePath)
    } catch {
      // file may already be gone
    }
    try {
      await rm(path.dirname(absolutePath), { recursive: true })
    } catch {
      // directory cleanup is best-effort
    }
  }

  getPublicUrl(storageKey: string): string {
    const [documentId] = storageKey.split("/")
    return `/api/files/${documentId}`
  }

  resolvePath(storageKey: string) {
    return path.join(getUploadRoot(), storageKey)
  }
}
