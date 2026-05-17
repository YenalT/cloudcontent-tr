import "server-only"

import {
  JobStatus,
  Prisma,
  SocialAssetGenerationType,
  SocialAssetUploadStatus,
} from "@prisma/client"
import { readFile } from "fs/promises"

import { isAzureBlobStorageReady } from "@/lib/data/storage-provider-config"
import { prisma } from "@/lib/prisma"
import { AzureBlobStorageError } from "@/lib/storage/azure-blob-errors"
import {
  getLocalSocialImageStorageService,
  getSocialImageStorageServiceAsync,
} from "@/lib/storage/social-image-storage"
import {
  prepareImageForInstagramUpload,
  toProcessingLogMetadata,
  toSafeImageDiagnostics,
  type SafeImageDiagnostics,
} from "@/lib/image-processing/prepare-image-upload"
import { validateInstagramPostImageBuffer } from "@/lib/image-processing/validate-instagram-post-image"
import { validateBlobImageUrl } from "@/lib/image-processing/validate-blob-image-url"
import type { SocialImageUploadInput, StoredSocialImage } from "@/lib/storage/social-image-types"

function generationTypeFromAssetKey(assetKey: string): SocialAssetGenerationType {
  if (assetKey === "post") return SocialAssetGenerationType.POST
  if (assetKey === "story") return SocialAssetGenerationType.STORY
  return SocialAssetGenerationType.CAROUSEL
}

function isPublicHttpsUrl(url: string | null | undefined): boolean {
  return Boolean(url?.startsWith("https://"))
}

async function writeUploadLog(params: {
  socialPostId: string
  socialAssetId?: string
  assetKey?: string
  status: JobStatus
  message: string
  retryCount?: number
  metadata?: Prisma.InputJsonValue
}) {
  await prisma.socialAssetUploadLog
    .create({
      data: {
        socialPostId: params.socialPostId,
        socialAssetId: params.socialAssetId,
        assetKey: params.assetKey,
        status: params.status,
        message: params.message,
        retryCount: params.retryCount ?? 0,
        metadata: params.metadata,
      },
    })
    .catch(() => null)
}

async function persistUploadResult(
  assetId: string,
  stored: StoredSocialImage,
  input: { postId: string; assetKey: string; imageMeta?: SafeImageDiagnostics }
) {
  const isAzure = stored.provider === "azure" && isPublicHttpsUrl(stored.publicUrl)
  const uploadStatus = isAzure
    ? SocialAssetUploadStatus.UPLOADED
    : SocialAssetUploadStatus.LOCAL_ONLY

  await prisma.socialAsset.update({
    where: { id: assetId },
    data: {
      blobPath: stored.storageKey,
      publicUrl: stored.publicUrl,
      storageProvider: stored.provider,
      mimeType: stored.mimeType,
      detectedMimeType: stored.detectedMimeType ?? stored.mimeType,
      fileSizeBytes: stored.fileSizeBytes,
      width: stored.width,
      height: stored.height,
      blobValidationOk: stored.blobValidationOk ?? null,
      blobValidationMessage: stored.blobValidationMessage ?? null,
      uploadStatus,
      uploadedAt: stored.uploadedAt,
      uploadError: null,
    },
  })

  await writeUploadLog({
    socialPostId: input.postId,
    socialAssetId: assetId,
    assetKey: input.assetKey,
    status: JobStatus.SUCCESS,
    message: isAzure ? `Azure’a yüklendi: ${input.assetKey}` : `Yerel kayıt: ${input.assetKey}`,
    metadata: {
      provider: stored.provider,
      publicUrl: stored.publicUrl,
      mimeType: stored.mimeType,
      detectedMimeType: stored.detectedMimeType,
      fileSizeBytes: stored.fileSizeBytes,
      width: stored.width,
      height: stored.height,
      blobValidationOk: stored.blobValidationOk,
      ...(input.imageMeta
        ? {
            originalWidth: input.imageMeta.originalWidth,
            originalHeight: input.imageMeta.originalHeight,
            originalFileSizeBytes: input.imageMeta.originalFileSizeBytes,
            processingDurationMs: input.imageMeta.processingDurationMs,
          }
        : {}),
    },
  })
}

async function enrichAzureUpload(stored: StoredSocialImage): Promise<StoredSocialImage> {
  if (!stored.publicUrl?.startsWith("https://")) return stored

  const validation = await validateBlobImageUrl(stored.publicUrl, {
    strictInstagramPost: true,
  })
  const dim =
    validation.width && validation.height
      ? ` · ${validation.width}×${validation.height}`
      : ""
  return {
    ...stored,
    blobValidationOk: validation.ok,
    blobValidationMessage: validation.ok
      ? `HTTP ${validation.httpStatus} · ${validation.detectedMime}${dim}`
      : validation.message ?? "Blob URL doğrulaması başarısız.",
  }
}

async function buildPreparedUploadInput(input: SocialImageUploadInput) {
  const prepared = await prepareImageForInstagramUpload({
    buffer: input.buffer,
    assetKey: input.assetKey,
  })
  const imageMeta = toSafeImageDiagnostics(prepared)

  const postIssues =
    input.assetKey === "post"
      ? validateInstagramPostImageBuffer({
          width: imageMeta.width,
          height: imageMeta.height,
          mimeType: imageMeta.mimeType,
          fileSizeBytes: imageMeta.fileSizeBytes,
        })
      : []

  if (postIssues.length > 0) {
    throw new Error(postIssues[0])
  }

  return {
    buffer: prepared.buffer,
    mimeType: prepared.mimeType,
    fileName: prepared.fileName,
    postId: input.postId,
    assetKey: input.assetKey,
    imageMeta,
  }
}

export async function uploadAndRecordSocialAsset(
  input: SocialImageUploadInput
): Promise<StoredSocialImage & { socialAssetId: string }> {
  const generationType = generationTypeFromAssetKey(input.assetKey)

  const asset = await prisma.socialAsset.upsert({
    where: {
      socialPostId_assetKey: {
        socialPostId: input.postId,
        assetKey: input.assetKey,
      },
    },
    create: {
      socialPostId: input.postId,
      assetKey: input.assetKey,
      generationType,
      mimeType: input.mimeType,
      fileName: input.fileName,
      uploadStatus: SocialAssetUploadStatus.UPLOADING,
    },
    update: {
      mimeType: input.mimeType,
      fileName: input.fileName,
      uploadStatus: SocialAssetUploadStatus.UPLOADING,
      uploadError: null,
    },
  })

  await writeUploadLog({
    socialPostId: input.postId,
    socialAssetId: asset.id,
    assetKey: input.assetKey,
    status: JobStatus.RUNNING,
    message: `Yükleme başladı: ${input.assetKey}`,
  })

  try {
    const preparedInput = await buildPreparedUploadInput(input)
    const storage = await getSocialImageStorageServiceAsync()
    let stored = await storage.upload(preparedInput)
    if (stored.provider === "azure") {
      stored = await enrichAzureUpload({
        ...stored,
        width: preparedInput.imageMeta.width,
        height: preparedInput.imageMeta.height,
        fileSizeBytes: preparedInput.imageMeta.fileSizeBytes,
        detectedMimeType: preparedInput.imageMeta.detectedMimeType,
      })
    } else {
      stored = {
        ...stored,
        width: preparedInput.imageMeta.width,
        height: preparedInput.imageMeta.height,
        fileSizeBytes: preparedInput.imageMeta.fileSizeBytes,
        detectedMimeType: preparedInput.imageMeta.detectedMimeType,
      }
    }
    await persistUploadResult(asset.id, stored, {
      postId: input.postId,
      assetKey: input.assetKey,
      imageMeta: preparedInput.imageMeta,
    })
    return { ...stored, socialAssetId: asset.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Yükleme başarısız."
    await prisma.socialAsset.update({
      where: { id: asset.id },
      data: {
        uploadStatus: SocialAssetUploadStatus.FAILED,
        uploadError: message,
      },
    })
    await writeUploadLog({
      socialPostId: input.postId,
      socialAssetId: asset.id,
      assetKey: input.assetKey,
      status: JobStatus.FAILED,
      message: `${input.assetKey}: ${message}`,
    })
    throw error
  }
}

async function readLocalAssetBuffer(
  asset: { blobPath: string | null },
  local: NonNullable<ReturnType<typeof getLocalSocialImageStorageService>>
): Promise<Buffer | null> {
  if (!asset.blobPath) return null
  try {
    return await readFile(local.resolvePath(asset.blobPath))
  } catch {
    return null
  }
}

async function uploadAssetBufferToAzure(
  socialPostId: string,
  asset: {
    id: string
    assetKey: string
    fileName: string
    mimeType: string
  },
  buffer: Buffer
): Promise<boolean> {
  const retryCount =
    (await prisma.socialAssetUploadLog.count({
      where: { socialPostId, assetKey: asset.assetKey },
    })) + 1

  await prisma.socialAsset.update({
    where: { id: asset.id },
    data: { uploadStatus: SocialAssetUploadStatus.UPLOADING, uploadError: null },
  })

  await writeUploadLog({
    socialPostId,
    socialAssetId: asset.id,
    assetKey: asset.assetKey,
    status: JobStatus.RUNNING,
    message: `Blob’a yükleniyor: ${asset.assetKey}`,
    retryCount,
  })

  try {
    const preparedInput = await buildPreparedUploadInput({
      buffer,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      postId: socialPostId,
      assetKey: asset.assetKey,
    })
    const storage = await getSocialImageStorageServiceAsync()
    let stored = await storage.upload(preparedInput)

    if (stored.provider !== "azure" || !isPublicHttpsUrl(stored.publicUrl)) {
      throw new AzureBlobStorageError(
        "Azure Blob yüklemesi tamamlandı ancak public HTTPS URL üretilemedi."
      )
    }

    stored = await enrichAzureUpload({
      ...stored,
      width: preparedInput.imageMeta.width,
      height: preparedInput.imageMeta.height,
      fileSizeBytes: preparedInput.imageMeta.fileSizeBytes,
      detectedMimeType: preparedInput.imageMeta.detectedMimeType,
    })

    if (!stored.blobValidationOk) {
      throw new AzureBlobStorageError(
        stored.blobValidationMessage ?? "Blob URL doğrulaması başarısız."
      )
    }

    await persistUploadResult(asset.id, stored, {
      postId: socialPostId,
      assetKey: asset.assetKey,
      imageMeta: preparedInput.imageMeta,
    })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : "Blob yüklemesi başarısız."
    await prisma.socialAsset.update({
      where: { id: asset.id },
      data: {
        uploadStatus: SocialAssetUploadStatus.FAILED,
        uploadError: message,
      },
    })
    await writeUploadLog({
      socialPostId,
      socialAssetId: asset.id,
      assetKey: asset.assetKey,
      status: JobStatus.FAILED,
      message,
      retryCount,
    })
    return false
  }
}

export async function uploadAllSocialAssetsToBlob(socialPostId: string) {
  const ready = await isAzureBlobStorageReady()
  if (!ready) {
    return {
      ok: false as const,
      message:
        "Azure Blob Storage must be configured before sending Instagram assets to Zapier.",
    }
  }

  const post = await prisma.socialPost.findUnique({
    where: { id: socialPostId },
    include: { socialAssets: true },
  })
  if (!post) {
    return { ok: false as const, message: "Taslak bulunamadı." }
  }

  const local = getLocalSocialImageStorageService()
  let uploaded = 0
  let failed = 0

  const postAsset = post.socialAssets.find((a) => a.assetKey === "post")
  if (!postAsset) {
    return { ok: false as const, message: "Gönderi görseli bulunamadı. Önce taslağı yeniden üretin." }
  }

  if (
    postAsset.uploadStatus === SocialAssetUploadStatus.UPLOADED &&
    postAsset.storageProvider === "azure" &&
    isPublicHttpsUrl(postAsset.publicUrl) &&
    postAsset.blobValidationOk === true
  ) {
    return { ok: true as const, message: "Gönderi görseli zaten Blob Storage’da." }
  }

  let buffer: Buffer | null = null
  if (local && postAsset.blobPath) {
    buffer = await readLocalAssetBuffer(postAsset, local)
  }

  if (!buffer) {
    return {
      ok: false as const,
      message: "Yerel gönderi görseli bulunamadı. «Görseli Yeniden Üret» ile tekrar deneyin.",
    }
  }

  const success = await uploadAssetBufferToAzure(socialPostId, postAsset, buffer)
  if (success) uploaded = 1
  else failed = 1

  await syncSocialPostUrlsFromAssets(socialPostId)

  if (failed > 0) {
    return {
      ok: false as const,
      message: "Gönderi görseli Blob’a yüklenemedi. Azure ayarlarını kontrol edin.",
    }
  }

  return {
    ok: true as const,
    message: "Gönderi görseli Blob Storage’a yüklendi.",
  }
}

export const uploadPostImageToBlob = uploadAllSocialAssetsToBlob

export async function ensureSocialAssetsUploadedToBlob(socialPostId: string) {
  const result = await uploadAllSocialAssetsToBlob(socialPostId)
  if (!result.ok) return result

  const postAsset = await prisma.socialAsset.findFirst({
    where: { socialPostId, assetKey: "post" },
  })

  const needsBlob =
    !postAsset ||
    postAsset.uploadStatus !== SocialAssetUploadStatus.UPLOADED ||
    postAsset.storageProvider !== "azure" ||
    !isPublicHttpsUrl(postAsset.publicUrl) ||
    postAsset.blobValidationOk !== true

  if (needsBlob) {
    return {
      ok: false as const,
      message: "Gönderi görseli Blob’da değil. «Görseli Blob’a Yükle» ile yükleyin.",
    }
  }

  return { ok: true as const, message: result.message }
}

export async function syncSocialPostUrlsFromAssets(socialPostId: string) {
  const assets = await prisma.socialAsset.findMany({
    where: { socialPostId },
    orderBy: { assetKey: "asc" },
  })

  const pickUrl = (asset: (typeof assets)[0]) => {
    if (isPublicHttpsUrl(asset.publicUrl)) return asset.publicUrl
    return null
  }

  const post = assets.find((a) => a.assetKey === "post")

  await prisma.socialPost.update({
    where: { id: socialPostId },
    data: {
      postImageUrl: post ? pickUrl(post) : null,
      postImageStorageKey: post?.blobPath ?? null,
      storyImageUrl: null,
      storyImageStorageKey: null,
      carouselImageUrls: [],
      carouselImageStorageKeys: [],
    },
  })
}

export async function deleteSocialAssetsForPost(socialPostId: string) {
  const assets = await prisma.socialAsset.findMany({ where: { socialPostId } })
  const storage = await getSocialImageStorageServiceAsync()
  const local = getLocalSocialImageStorageService()

  await Promise.all(
    assets.map(async (asset) => {
      if (!asset.blobPath) return
      if (asset.storageProvider === "azure") {
        await storage.delete(asset.blobPath).catch(() => null)
      } else if (local) {
        await local.delete(asset.blobPath).catch(() => null)
      }
    })
  )

  await prisma.socialAsset.deleteMany({ where: { socialPostId } })
}

export async function retryFailedSocialAssetUploads(socialPostId: string) {
  return uploadAllSocialAssetsToBlob(socialPostId)
}

async function loadPostAssetBuffer(socialPostId: string): Promise<{
  asset: {
    id: string
    assetKey: string
    fileName: string
    mimeType: string
    blobPath: string | null
    storageProvider: string | null
  }
  buffer: Buffer
} | null> {
  const post = await prisma.socialPost.findUnique({
    where: { id: socialPostId },
    include: { socialAssets: { where: { assetKey: "post" } } },
  })
  const postAsset = post?.socialAssets[0]
  if (!postAsset?.blobPath) return null

  const local = getLocalSocialImageStorageService()
  let buffer: Buffer | null = null

  if (local) {
    buffer = await readLocalAssetBuffer(postAsset, local)
  }

  if (!buffer && postAsset.publicUrl?.startsWith("https://")) {
    try {
      const res = await fetch(postAsset.publicUrl, {
        signal: AbortSignal.timeout(20_000),
      })
      if (res.ok) {
        buffer = Buffer.from(await res.arrayBuffer())
      }
    } catch {
      buffer = null
    }
  }

  if (!buffer) return null

  return {
    asset: {
      id: postAsset.id,
      assetKey: postAsset.assetKey,
      fileName: postAsset.fileName,
      mimeType: postAsset.mimeType,
      blobPath: postAsset.blobPath,
      storageProvider: postAsset.storageProvider,
    },
    buffer,
  }
}

/** Re-encode existing post image to 1080×1080 JPEG and re-upload to storage. */
export async function reprocessPostImageForInstagram(socialPostId: string) {
  const loaded = await loadPostAssetBuffer(socialPostId)
  if (!loaded) {
    return {
      ok: false as const,
      message: "Görsel bulunamadı. Önce «Görseli Yeniden Üret» ile oluşturun.",
    }
  }

  const prepared = await prepareImageForInstagramUpload({
    buffer: loaded.buffer,
    assetKey: "post",
  })

  const success = await uploadAssetBufferToAzure(
    socialPostId,
    {
      id: loaded.asset.id,
      assetKey: loaded.asset.assetKey,
      fileName: prepared.fileName,
      mimeType: prepared.mimeType,
    },
    prepared.buffer
  )

  if (!success) {
    return { ok: false as const, message: "Optimize edilmiş görsel Blob'a yüklenemedi." }
  }

  await syncSocialPostUrlsFromAssets(socialPostId)

  await writeUploadLog({
    socialPostId,
    socialAssetId: loaded.asset.id,
    assetKey: "post",
    status: JobStatus.SUCCESS,
    message: `Instagram optimizasyonu: ${prepared.width}×${prepared.height}, ${Math.round(prepared.fileSizeBytes / 1024)} KB`,
    metadata: toProcessingLogMetadata(prepared),
  })

  return {
    ok: true as const,
    message: `Görsel Instagram için optimize edildi (${prepared.width}×${prepared.height}, ${Math.round(prepared.fileSizeBytes / 1024)} KB).`,
    width: prepared.width,
    height: prepared.height,
    fileSizeBytes: prepared.fileSizeBytes,
  }
}

export async function ensurePostImageReadyForZapier(socialPostId: string) {
  const postAsset = await prisma.socialAsset.findFirst({
    where: { socialPostId, assetKey: "post" },
  })

  if (!postAsset) {
    return { ok: false as const, message: "Gönderi görseli bulunamadı." }
  }

  function assetIssues(asset: typeof postAsset) {
    if (!asset) return ["Gönderi görseli bulunamadı."]
    return validateInstagramPostImageBuffer({
      width: asset.width ?? 0,
      height: asset.height ?? 0,
      mimeType: asset.mimeType,
      fileSizeBytes: asset.fileSizeBytes ?? 0,
    })
  }

  let issues = assetIssues(postAsset)
  const blobNotReady =
    postAsset.uploadStatus !== SocialAssetUploadStatus.UPLOADED ||
    postAsset.storageProvider !== "azure" ||
    !isPublicHttpsUrl(postAsset.publicUrl) ||
    postAsset.blobValidationOk !== true

  if (issues.length === 0 && !blobNotReady) {
    return { ok: true as const, message: "Görsel Zapier için hazır." }
  }

  if (issues.length > 0) {
    const reprocessed = await reprocessPostImageForInstagram(socialPostId)
    if (!reprocessed.ok) {
      return { ok: false as const, message: reprocessed.message }
    }
  } else if (blobNotReady) {
    const blobResult = await uploadAllSocialAssetsToBlob(socialPostId)
    if (!blobResult.ok) {
      return { ok: false as const, message: blobResult.message }
    }
  }

  const refreshed = await prisma.socialAsset.findFirst({
    where: { socialPostId, assetKey: "post" },
  })

  issues = assetIssues(refreshed)
  if (issues.length > 0) {
    return { ok: false as const, message: issues[0] }
  }

  if (
    refreshed &&
    (refreshed.uploadStatus !== SocialAssetUploadStatus.UPLOADED ||
      refreshed.storageProvider !== "azure" ||
      !isPublicHttpsUrl(refreshed.publicUrl) ||
      refreshed.blobValidationOk !== true)
  ) {
    return {
      ok: false as const,
      message: "Görsel Blob'da doğrulanamadı. Azure ayarlarını kontrol edin.",
    }
  }

  return { ok: true as const, message: "Görsel Zapier için optimize edildi ve doğrulandı." }
}
