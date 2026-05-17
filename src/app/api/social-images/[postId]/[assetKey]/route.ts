import { readFile } from "fs/promises"
import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getLocalSocialImageStorageService } from "@/lib/storage/social-image-storage"

const MIME: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
}

function mimeFromFileName(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase()
  return (ext && MIME[ext]) || "application/octet-stream"
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ postId: string; assetKey: string }> }
) {
  const { postId, assetKey } = await params

  const post = await prisma.socialPost.findUnique({ where: { id: postId } })
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let storageKey: string | null = null
  if (assetKey === "post") storageKey = post.postImageStorageKey
  else if (assetKey === "story") storageKey = post.storyImageStorageKey
  else if (assetKey.startsWith("carousel-")) {
    const index = Number(assetKey.replace("carousel-", ""))
    const keys = Array.isArray(post.carouselImageStorageKeys)
      ? post.carouselImageStorageKeys
      : []
    storageKey = typeof keys[index] === "string" ? keys[index] : null
  }

  if (!storageKey) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 })
  }

  const local = getLocalSocialImageStorageService()
  if (!local) {
    return NextResponse.json(
      { error: "Social image serving requires local storage in development." },
      { status: 501 }
    )
  }

  try {
    const filePath = local.resolvePath(storageKey)
    const buffer = await readFile(filePath)
    const fileName = storageKey.split("/").pop() ?? "image.svg"
    const contentType = mimeFromFileName(fileName)

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
  }
}
