"use server"

import { revalidatePath } from "next/cache"
import { JobStatus } from "@prisma/client"

import {
  publishApprovedSocialPost,
  writePublishJobLog,
} from "@/lib/instagram-graph/publisher"
import {
  InstagramGraphError,
  isInstagramGraphError,
} from "@/lib/instagram-graph/errors"
import { isMetaConfigured } from "@/lib/instagram-graph/meta-config"
import { prisma } from "@/lib/prisma"

export type InstagramGraphActionState = {
  ok: boolean
  message?: string
}

export async function disconnectInstagramAccount(
  accountId: string
): Promise<InstagramGraphActionState> {
  try {
    await prisma.instagramAccount.delete({ where: { id: accountId } })
    revalidatePath("/instagram")
    revalidatePath("/settings")
    return { ok: true, message: "Instagram hesabı bağlantısı kaldırıldı." }
  } catch {
    return { ok: false, message: "Hesap bağlantısı kaldırılamadı." }
  }
}

export async function publishInstagramPost(
  postId: string
): Promise<InstagramGraphActionState> {
  if (!isMetaConfigured()) {
    return {
      ok: false,
      message: "Meta uygulama kimlik bilgileri yapılandırılmamış (META_APP_ID / META_APP_SECRET).",
    }
  }

  const post = await prisma.socialPost.findUnique({
    where: { id: postId },
    select: { id: true, articleId: true, status: true, approvedAt: true },
  })

  if (!post) {
    return { ok: false, message: "Gönderi bulunamadı." }
  }

  const started = Date.now()

  await writePublishJobLog({
    postId,
    articleId: post.articleId,
    status: JobStatus.RUNNING,
    message: `Instagram yayını başladı: ${postId}`,
  })

  try {
    const result = await publishApprovedSocialPost(postId)

    await writePublishJobLog({
      postId,
      articleId: post.articleId,
      status: JobStatus.SUCCESS,
      message: `Instagram yayını başarılı. Feed media: ${result.feedMediaId}`,
      duration: `${Date.now() - started}ms`,
      metadata: {
        feedMediaId: result.feedMediaId,
        storyMediaId: result.storyMediaId,
      },
    })

    revalidatePath("/instagram")
    revalidatePath("/logs")

    return {
      ok: true,
      message: "Gönderi Instagram'da yayınlandı.",
    }
  } catch (error) {
    const message = isInstagramGraphError(error)
      ? error.message
      : error instanceof Error
        ? error.message
        : "Yayın başarısız."

    await prisma.socialPost
      .update({
        where: { id: postId },
        data: { publishError: message },
      })
      .catch(() => null)

    await writePublishJobLog({
      postId,
      articleId: post.articleId,
      status: JobStatus.FAILED,
      message,
      duration: `${Date.now() - started}ms`,
      metadata: { error: message },
    })

    revalidatePath("/instagram")

    return { ok: false, message }
  }
}
