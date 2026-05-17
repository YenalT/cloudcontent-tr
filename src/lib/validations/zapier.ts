import { z } from "zod"

import { assertValidZapierWebhookUrl } from "@/lib/zapier/zapier-webhook-errors"

const webhookUrlSchema = z
  .string()
  .min(1, "Webhook URL gerekli")
  .transform((v) => assertValidZapierWebhookUrl(v))

export const zapierSettingsSchema = z.object({
  webhookUrl: webhookUrlSchema.optional(),
  updateWebhookUrl: z.boolean().optional(),
  isActive: z.boolean(),
  timeoutMs: z.coerce.number().int().min(5000).max(120000),
  maxRetries: z.coerce.number().int().min(0).max(5),
})

export type ZapierSettingsInput = z.infer<typeof zapierSettingsSchema>

export const zapierSettingsTestSchema = zapierSettingsSchema.extend({
  webhookUrl: webhookUrlSchema.optional(),
})
