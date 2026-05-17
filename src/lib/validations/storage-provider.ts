import { z } from "zod"

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))

export const storageProviderSettingsSchema = z.object({
  storageAccountName: z.string().trim().max(200).optional(),
  connectionString: z.string().trim().min(10).optional(),
  updateConnectionString: z.boolean().optional(),
  containerName: z
    .string()
    .trim()
    .min(1, "Konteyner adı gerekli")
    .max(63)
    .regex(/^[a-z0-9-]+$/, "Konteyner adı yalnızca küçük harf, rakam ve tire içerebilir"),
  publicBaseUrl: optionalUrl,
  enablePublicUrls: z.boolean(),
  isActive: z.boolean(),
})

export type StorageProviderSettingsInput = z.infer<typeof storageProviderSettingsSchema>

export const storageProviderTestSchema = storageProviderSettingsSchema.extend({
  connectionString: z.string().trim().min(10).optional(),
})

export const storageProviderPublicUrlTestSchema = z.object({
  publicUrl: z.string().url("Geçerli bir HTTPS URL girin"),
})
