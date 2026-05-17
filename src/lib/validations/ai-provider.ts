import { z } from "zod"

const asciiApiKey = z
  .string()
  .min(1, "API anahtarı gerekli")
  .refine(
    (v) => [...v].every((_, i) => v.charCodeAt(i) <= 127),
    "API anahtarı yalnızca ASCII karakter içermeli (Türkçe harf veya emoji yapıştırmayın)."
  )

export const azureOpenAiSettingsSchema = z.object({
  endpoint: z
    .string()
    .min(1, "Endpoint gerekli")
    .url("Geçerli bir HTTPS endpoint girin")
    .refine((v) => v.startsWith("https://"), "Endpoint https:// ile başlamalı"),
  deploymentName: z.string().min(1, "Deployment adı gerekli").max(100),
  apiVersion: z.string().min(1, "API sürümü gerekli").max(50),
  temperature: z.coerce.number().min(0).max(2),
  maxTokens: z.coerce.number().int().min(256).max(128000),
  timeoutMs: z.coerce.number().int().min(5000).max(600000),
  isActive: z.boolean(),
  /** Empty = keep existing key */
  apiKey: asciiApiKey.optional(),
  updateApiKey: z.boolean().optional(),
})

export type AzureOpenAiSettingsInput = z.infer<typeof azureOpenAiSettingsSchema>
