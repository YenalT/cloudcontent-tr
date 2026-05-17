import "server-only"

import { isAzureBlobStorageReady } from "@/lib/data/storage-provider-config"
import type { ZapierInstagramPostPayload } from "@/lib/zapier/zapier-webhook-types"
import {
  AZURE_BLOB_NOT_CONFIGURED_MESSAGE,
  resolvePostImageUrlFromAssets,
  validateZapierPostImageUrl,
} from "@/lib/zapier/zapier-image-url-validation"
import { validatePostImageUrlWithRemoteCheck } from "@/lib/zapier/validate-zapier-image-urls-remote"

const MAX_STRING = 50_000

function truncate(value: string, max = MAX_STRING) {
  if (value.length <= max) return value
  return `${value.slice(0, max)}…`
}

function formatHashtags(hashtags: string[]): string {
  return hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")
}

function normalizeTaggedUsers(users: string[]): string[] {
  return users
    .map((u) => u.trim().replace(/^@/, ""))
    .filter(Boolean)
    .slice(0, 20)
}

export type BuildZapierPublishPayloadInput = {
  socialPostId: string
  articleId: string
  articleTitle: string
  caption: string
  hashtags: string[]
  taggedUsers?: string[]
  postImageUrl?: string | null
  socialAssets?: Array<{
    assetKey: string
    publicUrl: string | null
    uploadStatus: string
    storageProvider?: string | null
  }>
  requireAzureBlob?: boolean
  skipRemoteImageCheck?: boolean
}

export async function buildZapierPublishPayload(
  input: BuildZapierPublishPayloadInput
): Promise<{ ok: true; payload: ZapierInstagramPostPayload } | { ok: false; message: string }> {
  if (!input.caption?.trim()) {
    return { ok: false, message: "Caption boş olamaz." }
  }

  if (input.requireAzureBlob !== false) {
    const ready = await isAzureBlobStorageReady()
    if (!ready) {
      return { ok: false, message: AZURE_BLOB_NOT_CONFIGURED_MESSAGE }
    }
  }

  const fromAsset = resolvePostImageUrlFromAssets(input.socialAssets ?? [])
  const postImageUrl = fromAsset ?? input.postImageUrl ?? null

  const imageValidation = input.skipRemoteImageCheck
    ? validateZapierPostImageUrl({ postImageUrl })
    : await validatePostImageUrlWithRemoteCheck(postImageUrl)

  if (!imageValidation.ok) {
    return { ok: false, message: imageValidation.message }
  }

  const taggedUsers = normalizeTaggedUsers(input.taggedUsers ?? [])

  const payload: ZapierInstagramPostPayload = {
    type: "instagram_post",
    socialPostId: input.socialPostId,
    articleId: input.articleId,
    articleTitle: truncate(input.articleTitle, 500),
    caption: truncate(input.caption),
    hashtags: formatHashtags(input.hashtags),
    taggedUsers,
    taggedUsersCsv: taggedUsers.join(","),
    postImageUrl: imageValidation.postImageUrl,
  }

  return { ok: true, payload }
}

export type ZapierPayloadPreview = {
  type: string
  caption: string
  hashtags: string
  taggedUsersCsv: string
  postImageUrl: string
}

export function toZapierPayloadPreview(payload: ZapierInstagramPostPayload): ZapierPayloadPreview {
  return {
    type: payload.type,
    caption: payload.caption,
    hashtags: payload.hashtags,
    taggedUsersCsv: payload.taggedUsersCsv,
    postImageUrl: payload.postImageUrl,
  }
}
