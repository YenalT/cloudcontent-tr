import { getImageGenerationService } from "@/lib/image-generation/image-generation-service"
import { INSTAGRAM_POST_SIZE } from "@/lib/image-generation/types"
import {
  deleteSocialAssetsForPost,
  syncSocialPostUrlsFromAssets,
  uploadAndRecordSocialAsset,
} from "@/lib/social-assets/social-asset-service"
import type { InstagramDraftText } from "@/lib/validations/instagram-draft"

export type InstagramPostVisualAsset = {
  postImageUrl: string
  postImageStorageKey: string
}

/** Generate and upload a single Instagram post image (OpenAI 1024² → 1080² JPEG on Blob). */
export async function generateInstagramPostImage(params: {
  postId: string
  articleTitle: string
  draft: Pick<InstagramDraftText, "postImagePrompt">
}): Promise<InstagramPostVisualAsset> {
  const imageGen = await getImageGenerationService()

  const postAsset = await imageGen.generate({
    prompt: params.draft.postImagePrompt,
    label: params.articleTitle,
    dimensions: INSTAGRAM_POST_SIZE,
    variant: "post",
  })

  const postStored = await uploadAndRecordSocialAsset({
    buffer: postAsset.buffer,
    fileName: postAsset.fileName,
    mimeType: postAsset.mimeType,
    postId: params.postId,
    assetKey: "post",
  })

  await syncSocialPostUrlsFromAssets(params.postId)

  return {
    postImageUrl: postStored.publicUrl,
    postImageStorageKey: postStored.storageKey,
  }
}

export async function deleteInstagramVisualAssets(postId: string) {
  await deleteSocialAssetsForPost(postId)
}
