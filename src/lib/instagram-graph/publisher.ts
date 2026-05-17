import { JobStatus, Prisma, SocialPostStatus } from "@prisma/client"

import { getActiveInstagramAccountWithToken } from "@/lib/data/instagram-account"
import { InstagramGraphError } from "@/lib/instagram-graph/errors"
import { InstagramGraphClient } from "@/lib/instagram-graph/graph-client"
import { getPublicAppUrl } from "@/lib/instagram-graph/meta-config"
import { prisma } from "@/lib/prisma"

type MediaCreateResponse = { id: string }
type MediaPublishResponse = { id: string }

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === "string")
}

function buildCaption(caption: string, hashtags: string[]) {
  const tags = hashtags
    .map((t) => (t.startsWith("#") ? t : `#${t.replace(/^#/, "")}`))
    .join(" ")
  return tags ? `${caption.trim()}\n\n${tags}` : caption.trim()
}

function absoluteImageUrl(relativePath: string) {
  const base = getPublicAppUrl()
  const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`
  return `${base}${path}`
}

async function waitForContainerReady(
  client: InstagramGraphClient,
  igUserId: string,
  containerId: string,
  maxAttempts = 30
) {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await client.get<{ status_code?: string }>(`/${containerId}`, {
      fields: "status_code",
    })
    if (status.status_code === "FINISHED") return
    if (status.status_code === "ERROR") {
      throw new InstagramGraphError("Instagram medya konteyneri işlenemedi.")
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new InstagramGraphError("Instagram medya konteyneri zaman aşımına uğradı.")
}

async function createImageContainer(
  client: InstagramGraphClient,
  igUserId: string,
  imageUrl: string,
  extra?: Record<string, string | boolean>
) {
  const created = await client.post<MediaCreateResponse>(`/${igUserId}/media`, {
    image_url: imageUrl,
    ...extra,
  })
  await waitForContainerReady(client, igUserId, created.id)
  return created.id
}

async function publishContainer(
  client: InstagramGraphClient,
  igUserId: string,
  creationId: string
) {
  return client.post<MediaPublishResponse>(`/${igUserId}/media_publish`, {
    creation_id: creationId,
  })
}

export type PublishResult = {
  feedMediaId: string
  storyMediaId?: string
}

export async function publishApprovedSocialPost(postId: string): Promise<PublishResult> {
  const post = await prisma.socialPost.findUnique({
    where: { id: postId },
    include: { instagramAccount: true },
  })

  if (!post) {
    throw new InstagramGraphError("Sosyal gönderi bulunamadı.")
  }

  if (post.status !== SocialPostStatus.APPROVED) {
    throw new InstagramGraphError(
      "Yalnızca admin tarafından onaylanmış (APPROVED) taslaklar yayınlanabilir."
    )
  }

  if (!post.approvedAt) {
    throw new InstagramGraphError(
      "Onay tarihi eksik. Taslağı yeniden onaylayın."
    )
  }

  if (post.publishedAt || post.externalPostId) {
    throw new InstagramGraphError("Bu gönderi zaten yayınlanmış.")
  }

  const connection = await getActiveInstagramAccountWithToken()
  if (!connection) {
    throw new InstagramGraphError(
      "Aktif Instagram hesabı bağlı değil. Önce Business/Creator hesabını bağlayın."
    )
  }

  const { account, accessToken } = connection
  const igUserId = account.instagramBusinessAccountId
  const client = new InstagramGraphClient(accessToken)
  const fullCaption = buildCaption(post.caption, post.hashtags)

  const carouselUrls = parseStringArray(post.carouselImageUrls)
  const postImageUrl = post.postImageUrl
  const storyImageUrl = post.storyImageUrl

  let feedMediaId: string

  if (carouselUrls.length >= 2) {
    const childIds: string[] = []
    for (const relativeUrl of carouselUrls.slice(0, 10)) {
      const imageUrl = absoluteImageUrl(relativeUrl)
      const childId = await createImageContainer(client, igUserId, imageUrl, {
        is_carousel_item: true,
      })
      childIds.push(childId)
    }

    const carouselContainer = await client.post<MediaCreateResponse>(`/${igUserId}/media`, {
      media_type: "CAROUSEL",
      children: childIds.join(","),
      caption: fullCaption,
    })
    await waitForContainerReady(client, igUserId, carouselContainer.id)
    const published = await publishContainer(client, igUserId, carouselContainer.id)
    feedMediaId = published.id
  } else if (postImageUrl) {
    const imageUrl = absoluteImageUrl(postImageUrl)
    const containerId = await createImageContainer(client, igUserId, imageUrl, {
      caption: fullCaption,
    })
    const published = await publishContainer(client, igUserId, containerId)
    feedMediaId = published.id
  } else {
    throw new InstagramGraphError("Yayın için post veya carousel görseli gerekli.")
  }

  let storyMediaId: string | undefined
  if (storyImageUrl) {
    const storyUrl = absoluteImageUrl(storyImageUrl)
    const storyContainer = await client.post<MediaCreateResponse>(`/${igUserId}/media`, {
      image_url: storyUrl,
      media_type: "STORIES",
    })
    await waitForContainerReady(client, igUserId, storyContainer.id)
    const storyPublished = await publishContainer(client, igUserId, storyContainer.id)
    storyMediaId = storyPublished.id
  }

  await prisma.socialPost.update({
    where: { id: postId },
    data: {
      status: SocialPostStatus.PUBLISHED,
      publishedAt: new Date(),
      externalPostId: feedMediaId,
      externalStoryId: storyMediaId ?? null,
      publishError: null,
      instagramAccountId: account.id,
    },
  })

  return { feedMediaId, storyMediaId }
}

export async function writePublishJobLog(params: {
  postId: string
  articleId: string
  status: JobStatus
  message: string
  duration?: string
  metadata?: Prisma.InputJsonValue
}) {
  await prisma.jobLog
    .create({
      data: {
        type: "instagram_publish",
        status: params.status,
        message: params.message,
        duration: params.duration,
        metadata: params.metadata,
      },
    })
    .catch(() => null)
}
