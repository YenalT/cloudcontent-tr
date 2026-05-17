import { z } from "zod"

import { IMAGE_STYLE_PRESETS } from "@/lib/image-generation/prompts/style-presets"

const presetIds = IMAGE_STYLE_PRESETS.map((p) => p.id) as [string, ...string[]]

export const instagramImagePromptsSchema = z.object({
  imageStylePreset: z.enum(presetIds),
  visualDirection: z.string().min(1),
  postImagePrompt: z.string().min(20),
})

export type InstagramImagePromptsInput = z.infer<typeof instagramImagePromptsSchema>
