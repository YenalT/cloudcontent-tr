import { z } from "zod"

const asciiApiKey = z
  .string()
  .min(1, "API anahtarı gerekli")
  .refine(
    (v) => [...v].every((_, i) => v.charCodeAt(i) <= 127),
    "API anahtarı yalnızca ASCII karakter içermeli."
  )

const qualitySchema = z.enum(["low", "medium", "high", "auto"], {
  errorMap: () => ({ message: "Kalite: low, medium, high veya auto olmalı" }),
})

const outputFormatSchema = z.enum(["png", "jpeg", "webp"], {
  errorMap: () => ({ message: "Çıktı biçimi: png, jpeg veya webp olmalı" }),
})

export const openAiImageSettingsSchema = z.object({
  model: z.string().min(1, "Model adı gerekli").max(100),
  quality: qualitySchema,
  outputFormat: outputFormatSchema,
  timeoutMs: z.coerce.number().int().min(10000).max(600000),
  isActive: z.boolean(),
  apiKey: asciiApiKey.optional(),
  updateApiKey: z.boolean().optional(),
})

export type OpenAiImageSettingsInput = z.infer<typeof openAiImageSettingsSchema>
