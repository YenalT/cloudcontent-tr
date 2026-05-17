import "server-only"

import { buildZapierPublishPayload } from "@/lib/zapier/build-zapier-publish-payload"
import type { ZapierInstagramPostPayload } from "@/lib/zapier/zapier-webhook-types"

export function getPublicAppBaseUrl(): string {
  const base =
    process.env.APP_PUBLIC_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000"
  return base.replace(/\/+$/, "")
}

export function toAbsoluteMediaUrl(relativeOrAbsolute: string | null | undefined): string | null {
  if (!relativeOrAbsolute?.trim()) return null
  const value = relativeOrAbsolute.trim()
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value
  }
  const base = getPublicAppBaseUrl()
  return `${base}${value.startsWith("/") ? value : `/${value}`}`
}

/** @deprecated Use buildZapierPublishPayload directly */
export async function buildZapierInstagramPayload(input: {
  socialPostId: string
  articleId: string
  articleTitle: string
  caption: string
  hashtags: string[]
  taggedUsers?: string[]
  postImageUrl: string | null
  socialAssets?: Array<{
    assetKey: string
    publicUrl: string | null
    uploadStatus: string
  }>
}): Promise<ZapierInstagramPostPayload> {
  const result = await buildZapierPublishPayload({
    ...input,
    socialAssets: input.socialAssets ?? [],
  })
  if (!result.ok) {
    throw new Error(result.message)
  }
  return result.payload
}
