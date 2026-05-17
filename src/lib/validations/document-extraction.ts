import { z } from "zod"

import { validateDocumentIntelligenceEndpoint } from "@/lib/document-intelligence/endpoint-utils"

const asciiApiKey = z
  .string()
  .min(1, "API anahtarı gerekli")
  .refine(
    (v) => [...v].every((_, i) => v.charCodeAt(i) <= 127),
    "API anahtarı yalnızca ASCII karakter içermeli (Türkçe harf veya emoji yapıştırmayın)."
  )

const documentIntelligenceEndpointSchema = z
  .string()
  .min(1, "Endpoint gerekli")
  .superRefine((value, ctx) => {
    const result = validateDocumentIntelligenceEndpoint(value)
    if (!result.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.message })
    }
  })
  .transform((value) => {
    const result = validateDocumentIntelligenceEndpoint(value)
    return result.ok ? result.normalized : value.trim().replace(/\/+$/, "")
  })

export const azureDocumentIntelligenceSettingsSchema = z.object({
  endpoint: documentIntelligenceEndpointSchema,
  apiVersion: z.string().min(1, "API sürümü gerekli").max(50),
  timeoutMs: z.coerce.number().int().min(5000).max(600000),
  pollIntervalMs: z.coerce.number().int().min(500).max(30000),
  maxPollAttempts: z.coerce.number().int().min(1).max(300),
  isActive: z.boolean(),
  apiKey: asciiApiKey.optional(),
  updateApiKey: z.boolean().optional(),
})

export type AzureDocumentIntelligenceSettingsInput = z.infer<
  typeof azureDocumentIntelligenceSettingsSchema
>
