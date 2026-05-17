import { mkdir, writeFile, unlink } from "fs/promises"
import path from "path"

import type {
  SocialImageStorageService,
  SocialImageUploadInput,
  StoredSocialImage,
} from "@/lib/storage/social-image-types"

function getSocialImageRoot() {
  return path.join(process.cwd(), process.env.LOCAL_SOCIAL_IMAGE_DIR ?? "storage/social-images")
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

export class LocalSocialImageStorageService implements SocialImageStorageService {
  readonly provider = "local"

  async upload(input: SocialImageUploadInput): Promise<StoredSocialImage> {
    const safeName = sanitizeFileName(input.fileName)
    const storageKey = `${input.postId}/${input.assetKey}/${safeName}`
    const absolutePath = path.join(getSocialImageRoot(), storageKey)

    await mkdir(path.dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, input.buffer)

    return {
      storageKey,
      publicUrl: `/api/social-images/${input.postId}/${input.assetKey}`,
      provider: this.provider,
      mimeType: input.mimeType,
      uploadedAt: new Date(),
    }
  }

  async delete(storageKey: string): Promise<void> {
    const absolutePath = path.join(getSocialImageRoot(), storageKey)
    try {
      await unlink(absolutePath)
    } catch {
      // best-effort
    }
  }

  getPublicUrl(storageKey: string): string {
    const [postId, assetKey] = storageKey.split("/")
    return `/api/social-images/${postId}/${assetKey}`
  }

  resolvePath(storageKey: string) {
    return path.join(getSocialImageRoot(), storageKey)
  }
}
