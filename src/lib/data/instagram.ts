import { SocialPlatform, SocialPostStatus } from "@prisma/client"

import { getLatestZapierWebhookLog } from "@/lib/data/zapier-config"
import { prisma } from "@/lib/prisma"
import { isAzureBlobStorageReady } from "@/lib/data/storage-provider-config"
import {
  getSocialImageStorageProviderNameAsync,
  isLocalSocialImageStorageActiveAsync,
} from "@/lib/storage/social-image-storage"
import { assessInstagramPostCompatibility } from "@/lib/image-processing/validate-instagram-post-image"
import {
  buildZapierPublishPayload,
  toZapierPayloadPreview,
} from "@/lib/zapier/build-zapier-publish-payload"

export async function getArticlesForInstagram() {
  const articles = await prisma.article.findMany({
    where: {
      content: { not: null },
      NOT: { content: "" },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      socialPosts: {
        where: { platform: SocialPlatform.INSTAGRAM },
        take: 1,
        select: { id: true, status: true, updatedAt: true },
      },
    },
  })

  return articles.map((a) => ({
    id: a.id,
    title: a.title,
    status: a.status.toLowerCase(),
    createdAt: a.createdAt.toISOString(),
    instagramDraft: a.socialPosts[0]
      ? {
          id: a.socialPosts[0].id,
          status: a.socialPosts[0].status.toLowerCase(),
          updatedAt: a.socialPosts[0].updatedAt.toISOString(),
        }
      : null,
  }))
}

export async function getInstagramDraftByArticleId(articleId: string) {
  const post = await prisma.socialPost.findUnique({
    where: {
      articleId_platform: {
        articleId,
        platform: SocialPlatform.INSTAGRAM,
      },
    },
    include: {
      article: {
        select: { id: true, title: true, slug: true, summary: true },
      },
      socialAssets: {
        where: { assetKey: "post" },
        select: {
          id: true,
          assetKey: true,
          generationType: true,
          blobPath: true,
          publicUrl: true,
          mimeType: true,
          uploadStatus: true,
          storageProvider: true,
          detectedMimeType: true,
          fileSizeBytes: true,
          width: true,
          height: true,
          blobValidationOk: true,
          blobValidationMessage: true,
          uploadError: true,
          uploadedAt: true,
        },
      },
      socialAssetUploadLogs: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          assetKey: true,
          status: true,
          message: true,
          retryCount: true,
          createdAt: true,
        },
      },
    },
  })

  if (!post) return null

  const latestZapierLog = await getLatestZapierWebhookLog(post.id)
  const [storageProvider, usesLocalStorage, azureBlobConfigured] = await Promise.all([
    getSocialImageStorageProviderNameAsync(),
    isLocalSocialImageStorageActiveAsync(),
    isAzureBlobStorageReady(),
  ])

  const zapierBuilt = await buildZapierPublishPayload({
    socialPostId: post.id,
    articleId: post.articleId,
    articleTitle: post.article.title,
    caption: post.caption,
    hashtags: post.hashtags,
    taggedUsers: post.taggedUsers,
    postImageUrl: post.postImageUrl,
    socialAssets: post.socialAssets,
    skipRemoteImageCheck: true,
  })

  const postAsset = post.socialAssets[0]

  return {
    id: post.id,
    articleId: post.articleId,
    articleTitle: post.article.title,
    articleSlug: post.article.slug,
    caption: post.caption,
    hashtags: post.hashtags,
    taggedUsers: post.taggedUsers,
    imageStylePreset: post.imageStylePreset,
    visualDirection: post.visualDirection ?? "",
    postImagePrompt: post.postImagePrompt ?? "",
    postImageUrl: post.postImageUrl,
    status: post.status.toLowerCase(),
    approvedAt: post.approvedAt?.toISOString() ?? null,
    rejectedAt: post.rejectedAt?.toISOString() ?? null,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    externalPostId: post.externalPostId,
    publishError: post.publishError,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    storageProvider,
    usesLocalStorage,
    azureBlobConfigured,
    localStorageWarning: !azureBlobConfigured
      ? "Azure Blob Storage yapılandırılmamış. Ayarlar’dan etkinleştirin."
      : usesLocalStorage
        ? "Gönderi görseli yerelde olabilir. Zapier’e göndermeden önce «Görseli Blob’a Yükle» kullanın."
        : null,
    postAsset: postAsset
      ? {
          id: postAsset.id,
          publicUrl: postAsset.publicUrl,
          mimeType: postAsset.mimeType,
          detectedMimeType: postAsset.detectedMimeType,
          fileSizeBytes: postAsset.fileSizeBytes,
          width: postAsset.width,
          height: postAsset.height,
          uploadStatus: postAsset.uploadStatus.toLowerCase(),
          storageProvider: postAsset.storageProvider,
          blobValidationOk: postAsset.blobValidationOk,
          blobValidationMessage: postAsset.blobValidationMessage,
          uploadError: postAsset.uploadError,
          uploadedAt: postAsset.uploadedAt?.toISOString() ?? null,
          instagramCompatibility: assessInstagramPostCompatibility({
            width: postAsset.width,
            height: postAsset.height,
            mimeType: postAsset.mimeType,
            fileSizeBytes: postAsset.fileSizeBytes,
            blobValidationOk: postAsset.blobValidationOk,
            publicUrl: postAsset.publicUrl,
          }),
        }
      : null,
    socialAssets: post.socialAssets.map((asset) => ({
      id: asset.id,
      assetKey: asset.assetKey,
      generationType: asset.generationType.toLowerCase(),
      blobPath: asset.blobPath,
      publicUrl: asset.publicUrl,
      mimeType: asset.mimeType,
      detectedMimeType: asset.detectedMimeType,
      fileSizeBytes: asset.fileSizeBytes,
      width: asset.width,
      height: asset.height,
      blobValidationOk: asset.blobValidationOk,
      blobValidationMessage: asset.blobValidationMessage,
      storageProvider: asset.storageProvider,
      uploadStatus: asset.uploadStatus.toLowerCase(),
      uploadError: asset.uploadError,
      uploadedAt: asset.uploadedAt?.toISOString() ?? null,
    })),
    canSendToZapier:
      post.status === SocialPostStatus.APPROVED &&
      azureBlobConfigured &&
      Boolean(post.caption?.trim()) &&
      Boolean(
        postAsset &&
          postAsset.uploadStatus === "UPLOADED" &&
          postAsset.storageProvider === "azure" &&
          postAsset.publicUrl?.startsWith("https://") &&
          postAsset.blobValidationOk === true
      ),
    uploadLogs: post.socialAssetUploadLogs.map((log) => ({
      id: log.id,
      assetKey: log.assetKey,
      status: log.status.toLowerCase(),
      message: log.message,
      retryCount: log.retryCount,
      createdAt: log.createdAt.toISOString(),
    })),
    zapierPayloadPreview: zapierBuilt.ok ? toZapierPayloadPreview(zapierBuilt.payload) : null,
    zapierPayloadValidationError: zapierBuilt.ok ? null : zapierBuilt.message,
    zapierDelivery: latestZapierLog
      ? {
          success: latestZapierLog.success,
          responseStatus: latestZapierLog.responseStatus,
          responseBody: latestZapierLog.responseBody,
          sentAt: latestZapierLog.sentAt.toISOString(),
          retryCount: latestZapierLog.retryCount,
          errorMessage: latestZapierLog.errorMessage,
          errorCode: latestZapierLog.errorCode,
          suggestedAction: latestZapierLog.suggestedAction,
          durationMs: latestZapierLog.durationMs,
          postImageUrl: latestZapierLog.postImageUrl,
          webhookUrlMasked: latestZapierLog.webhookUrlMasked,
          requestPayloadPreview: latestZapierLog.requestPayloadPreview,
        }
      : null,
  }
}

export async function getInstagramDrafts() {
  const posts = await prisma.socialPost.findMany({
    where: { platform: SocialPlatform.INSTAGRAM },
    orderBy: { updatedAt: "desc" },
    include: {
      article: { select: { title: true } },
    },
  })

  return posts.map((post) => ({
    id: post.id,
    articleId: post.articleId,
    articleTitle: post.article.title,
    caption: post.caption.slice(0, 120),
    status: post.status.toLowerCase(),
    updatedAt: post.updatedAt.toISOString(),
    postImageUrl: post.postImageUrl,
  }))
}

export type InstagramDraftDetail = NonNullable<
  Awaited<ReturnType<typeof getInstagramDraftByArticleId>>
>
export type ArticleForInstagramPicker = Awaited<
  ReturnType<typeof getArticlesForInstagram>
>[number]
