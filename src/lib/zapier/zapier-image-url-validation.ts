import "server-only"

import { AZURE_BLOB_NOT_CONFIGURED_MESSAGE } from "@/lib/storage/azure-blob-errors"

/** Instagram post feed images should be JPEG on Blob. */
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg"]

export { AZURE_BLOB_NOT_CONFIGURED_MESSAGE }

export type ZapierPostImageValidationResult =
  | { ok: true; postImageUrl: string }
  | { ok: false; message: string; issues: string[] }

function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.endsWith(".local")
    )
  } catch {
    return true
  }
}

function hasAllowedExtension(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    return ALLOWED_EXTENSIONS.some((ext) => pathname.endsWith(ext))
  } catch {
    return false
  }
}

export function validatePostImageUrl(url: string | null | undefined): string[] {
  const issues: string[] = []
  if (!url?.trim()) {
    issues.push("postImageUrl: URL eksik.")
    return issues
  }
  const trimmed = url.trim()
  if (!trimmed.startsWith("https://")) {
    issues.push("postImageUrl: Yalnızca public HTTPS URL kabul edilir.")
  }
  if (isLocalhostUrl(trimmed)) {
    issues.push("postImageUrl: localhost URL Zapier/Instagram tarafından erişilemez.")
  }
  if (!hasAllowedExtension(trimmed)) {
    issues.push("postImageUrl: Dosya uzantısı .jpg veya .jpeg olmalı (Instagram JPEG).")
  }
  return issues
}

export function resolvePostImageUrlFromAssets(
  assets: Array<{
    assetKey: string
    publicUrl: string | null
    uploadStatus: string
    storageProvider?: string | null
  }>
): string | null {
  const post = assets.find(
    (a) =>
      a.assetKey === "post" &&
      a.uploadStatus === "UPLOADED" &&
      a.storageProvider === "azure" &&
      a.publicUrl?.startsWith("https://")
  )
  return post?.publicUrl ?? null
}

export function validateZapierPostImageUrl(input: {
  postImageUrl: string | null | undefined
}): ZapierPostImageValidationResult {
  const issues = validatePostImageUrl(input.postImageUrl)
  if (issues.length > 0) {
    return {
      ok: false,
      message: issues[0] ?? "Görsel URL doğrulaması başarısız.",
      issues,
    }
  }
  return { ok: true, postImageUrl: input.postImageUrl!.trim() }
}
