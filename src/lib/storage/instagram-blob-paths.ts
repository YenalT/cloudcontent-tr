import "server-only"

const MIME_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
}

export function extensionFromMimeType(mimeType: string): string {
  return MIME_EXTENSION[mimeType.toLowerCase()] ?? "png"
}

/** Blob path inside container: {postId}/post.png, {postId}/carousel/slide-1.png */
export function buildInstagramBlobPath(
  postId: string,
  assetKey: string,
  mimeType: string
): string {
  const ext = extensionFromMimeType(mimeType)

  if (assetKey === "post") return `${postId}/post.${ext}`
  if (assetKey === "story") return `${postId}/story.${ext}`

  const carouselMatch = /^carousel-(\d+)$/.exec(assetKey)
  if (carouselMatch) {
    const slideNumber = Number(carouselMatch[1]) + 1
    return `${postId}/carousel/slide-${slideNumber}.${ext}`
  }

  return `${postId}/${assetKey}.${ext}`
}

export function isHttpsBlobUrl(url: string): boolean {
  return url.startsWith("https://")
}
