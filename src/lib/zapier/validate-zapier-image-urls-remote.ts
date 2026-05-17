import "server-only"

import { validateBlobImageUrl } from "@/lib/image-processing/validate-blob-image-url"
import {
  validateZapierPostImageUrl,
  type ZapierPostImageValidationResult,
} from "@/lib/zapier/zapier-image-url-validation"

export async function validatePostImageUrlWithRemoteCheck(
  postImageUrl: string | null | undefined
): Promise<ZapierPostImageValidationResult> {
  const basic = validateZapierPostImageUrl({ postImageUrl })
  if (!basic.ok) return basic

  const remote = await validateBlobImageUrl(basic.postImageUrl, {
    strictInstagramPost: true,
  })
  if (!remote.ok) {
    return {
      ok: false,
      message: remote.message ?? "Blob URL geçersiz.",
      issues: [remote.message ?? "Blob URL geçersiz."],
    }
  }

  return basic
}
