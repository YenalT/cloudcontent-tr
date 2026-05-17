"use server"

import { revalidatePath } from "next/cache"
import { JobStatus, Prisma, SocialPostStatus } from "@prisma/client"

import { resolveZapierWebhookRuntimeConfig } from "@/lib/data/zapier-config"
import { prisma } from "@/lib/prisma"
import {
  ensurePostImageReadyForZapier,
  reprocessPostImageForInstagram,
  retryFailedSocialAssetUploads,
  uploadPostImageToBlob,
} from "@/lib/social-assets/social-asset-service"
import {
  buildZapierPublishPayload,
  toZapierPayloadPreview,
  type ZapierPayloadPreview,
} from "@/lib/zapier/build-zapier-publish-payload"
import {
  buildSafePayloadPreview,
  deriveZapierErrorDetails,
  maskWebhookUrlForLog,
  sanitizeResponseHeaders,
} from "@/lib/zapier/zapier-delivery-logging"
import { toAdminZapierErrorMessage } from "@/lib/zapier/zapier-webhook-errors"
import type { ZapierInstagramPostPayload } from "@/lib/zapier/zapier-webhook-types"
import { ZapierWebhookService } from "@/lib/zapier/zapier-webhook-service"

export type InstagramZapierActionState = {
  ok: boolean
  message?: string
}

async function writeZapierJobLog(
  message: string,
  success: boolean,
  metadata: Prisma.InputJsonValue
) {
  await prisma.jobLog
    .create({
      data: {
        type: "zapier_webhook",
        status: success ? JobStatus.SUCCESS : JobStatus.FAILED,
        message,
        metadata,
      },
    })
    .catch(() => null)
}

async function loadPostForZapier(postId: string) {
  return prisma.socialPost.findUnique({
    where: { id: postId },
    include: {
      article: {
        select: { id: true, title: true },
      },
      socialAssets: {
        where: { assetKey: "post" },
        select: {
          assetKey: true,
          publicUrl: true,
          uploadStatus: true,
          storageProvider: true,
        },
      },
      zapierWebhookLogs: {
        orderBy: { sentAt: "desc" },
        take: 1,
        select: { retryCount: true },
      },
    },
  })
}

export async function previewInstagramZapierPayload(
  postId: string
): Promise<
  | { ok: true; preview: ZapierPayloadPreview; full: ZapierInstagramPostPayload }
  | { ok: false; message: string }
> {
  const post = await loadPostForZapier(postId)
  if (!post) {
    return { ok: false, message: "Instagram taslağı bulunamadı." }
  }

  const built = await buildZapierPublishPayload({
    socialPostId: post.id,
    articleId: post.article.id,
    articleTitle: post.article.title,
    caption: post.caption,
    hashtags: post.hashtags,
    taggedUsers: post.taggedUsers,
    postImageUrl: post.postImageUrl,
    socialAssets: post.socialAssets,
    skipRemoteImageCheck: false,
  })

  if (!built.ok) {
    return { ok: false, message: built.message }
  }

  return {
    ok: true,
    preview: toZapierPayloadPreview(built.payload),
    full: built.payload,
  }
}

async function deliverToZapier(postId: string, isRetry: boolean): Promise<InstagramZapierActionState> {
  const post = await loadPostForZapier(postId)
  if (!post) {
    return { ok: false, message: "Instagram taslağı bulunamadı." }
  }

  if (!isRetry) {
    if (post.status !== SocialPostStatus.APPROVED) {
      if (post.status === SocialPostStatus.SENT_TO_ZAPIER) {
        return { ok: false, message: "Bu taslak zaten Zapier’e gönderildi." }
      }
      return {
        ok: false,
        message: "Zapier’e göndermek için önce taslağı onaylayın.",
      }
    }
  } else if (
    post.status !== SocialPostStatus.FAILED &&
    post.status !== SocialPostStatus.SENT_TO_ZAPIER
  ) {
    return {
      ok: false,
      message: "Tekrar deneme yalnızca başarısız veya daha önce gönderilmiş taslaklar için kullanılabilir.",
    }
  }

  if (!post.approvedAt) {
    return { ok: false, message: "Onay tarihi eksik. Önce taslağı onaylayın." }
  }

  const blobReady = await ensurePostImageReadyForZapier(postId)
  if (!blobReady.ok) {
    return { ok: false, message: blobReady.message }
  }

  const postRefreshed = await loadPostForZapier(postId)
  if (!postRefreshed) {
    return { ok: false, message: "Instagram taslağı bulunamadı." }
  }

  let config
  try {
    config = await resolveZapierWebhookRuntimeConfig()
  } catch (error) {
    return { ok: false, message: toAdminZapierErrorMessage(error) }
  }

  const built = await buildZapierPublishPayload({
    socialPostId: postRefreshed.id,
    articleId: postRefreshed.article.id,
    articleTitle: postRefreshed.article.title,
    caption: postRefreshed.caption,
    hashtags: postRefreshed.hashtags,
    taggedUsers: postRefreshed.taggedUsers,
    postImageUrl: postRefreshed.postImageUrl,
    socialAssets: postRefreshed.socialAssets,
  })

  if (!built.ok) {
    return { ok: false, message: built.message }
  }

  const payload = built.payload
  const webhookUrlMasked = maskWebhookUrlForLog(config.webhookUrl)
  const requestPayloadPreview = buildSafePayloadPreview(payload)

  const previousRetryCount = postRefreshed.zapierWebhookLogs[0]?.retryCount ?? 0
  const initialRetryCount = isRetry ? previousRetryCount + 1 : 0

  const service = new ZapierWebhookService(config)
  const delivery = await service.deliver(payload, initialRetryCount)
  const errorDetails = deriveZapierErrorDetails(delivery)

  await prisma.zapierWebhookLog.create({
    data: {
      socialPostId: postRefreshed.id,
      articleId: postRefreshed.articleId,
      provider: "zapier",
      requestPayload: payload as unknown as Prisma.InputJsonValue,
      requestPayloadPreview,
      postImageUrl: payload.postImageUrl,
      webhookUrlMasked,
      responseStatus: delivery.httpStatus ?? null,
      responseBody: delivery.responseBody ?? null,
      responseHeaders: sanitizeResponseHeaders(delivery.responseHeaders),
      durationMs: delivery.durationMs ?? null,
      retryCount: delivery.retryCount,
      errorCode: errorDetails.errorCode,
      errorMessage: delivery.errorMessage ?? null,
      suggestedAction: errorDetails.suggestedAction,
      success: delivery.success,
    },
  })

  if (delivery.success) {
    await prisma.socialPost.update({
      where: { id: postRefreshed.id },
      data: {
        status: SocialPostStatus.SENT_TO_ZAPIER,
        publishError: null,
      },
    })

    await writeZapierJobLog(
      `Zapier webhook gönderildi: ${postRefreshed.article.title}`,
      true,
      {
        postId: postRefreshed.id,
        articleId: postRefreshed.articleId,
        httpStatus: delivery.httpStatus,
        durationMs: delivery.durationMs,
        retryCount: delivery.retryCount,
        postImageUrl: payload.postImageUrl,
        payloadKeys: Object.keys(payload),
      }
    )

    revalidatePath("/instagram")
    return {
      ok: true,
      message: `Zapier’e gönderildi (HTTP ${delivery.httpStatus ?? 200}, ${delivery.durationMs ?? 0}ms).`,
    }
  }

  await prisma.socialPost.update({
    where: { id: postRefreshed.id },
    data: {
      status: SocialPostStatus.FAILED,
      publishError: delivery.errorMessage ?? "Zapier webhook başarısız.",
    },
  })

  await writeZapierJobLog(
    `Zapier webhook başarısız: ${postRefreshed.article.title}`,
    false,
    {
      postId: postRefreshed.id,
      articleId: postRefreshed.articleId,
      error: delivery.errorMessage,
      errorCode: errorDetails.errorCode,
      suggestedAction: errorDetails.suggestedAction,
      retryCount: delivery.retryCount,
      durationMs: delivery.durationMs,
    }
  )

  revalidatePath("/instagram")
  const hint = errorDetails.suggestedAction ? ` ${errorDetails.suggestedAction}` : ""
  return {
    ok: false,
    message: (delivery.errorMessage ?? "Zapier webhook gönderimi başarısız.") + hint,
  }
}

export async function sendInstagramDraftToZapier(
  postId: string
): Promise<InstagramZapierActionState> {
  return deliverToZapier(postId, false)
}

export async function retryInstagramZapierWebhook(
  postId: string
): Promise<InstagramZapierActionState> {
  return deliverToZapier(postId, true)
}

export async function uploadInstagramPostImageToBlob(
  postId: string
): Promise<InstagramZapierActionState> {
  const result = await uploadPostImageToBlob(postId)
  revalidatePath("/instagram")
  return { ok: result.ok, message: result.message }
}

/** @deprecated */
export const uploadInstagramAssetsToBlob = uploadInstagramPostImageToBlob

export async function retryInstagramAssetUploads(
  postId: string
): Promise<InstagramZapierActionState> {
  const result = await retryFailedSocialAssetUploads(postId)
  revalidatePath("/instagram")
  return { ok: result.ok, message: result.message }
}

export async function reprocessInstagramPostImage(
  postId: string
): Promise<InstagramZapierActionState> {
  const result = await reprocessPostImageForInstagram(postId)
  revalidatePath("/instagram")
  return { ok: result.ok, message: result.message }
}

/** Alias — re-encodes to 1080×1080 JPEG under 5 MB. */
export const optimizeInstagramPostImageForPublishing = reprocessInstagramPostImage
