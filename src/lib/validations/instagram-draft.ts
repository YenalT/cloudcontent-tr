import { z } from "zod"

/** Single Instagram post draft (no story / carousel). */
export const instagramDraftTextSchema = z.object({
  caption: z.string().min(1),
  hashtags: z.array(z.string().min(1)).min(3).max(20),
  visualDirection: z.string().min(1),
  postImagePrompt: z.string().min(1),
})

export type InstagramDraftText = z.infer<typeof instagramDraftTextSchema>

export const instagramTaggedUsersSchema = z.object({
  taggedUsers: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(30)
        .transform((u) => u.replace(/^@/, ""))
    )
    .max(20),
})
