import { z } from "zod"

export const sourceUrlSchema = z.object({
  title: z
    .string()
    .min(2, "Başlık en az 2 karakter olmalı")
    .max(200, "Başlık en fazla 200 karakter olabilir"),
  url: z
    .string()
    .min(1, "URL gerekli")
    .url("Geçerli bir URL girin (https:// ile başlamalı)")
    .max(2048, "URL çok uzun"),
  category: z
    .string()
    .max(100, "Kategori en fazla 100 karakter olabilir")
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  isActive: z.boolean().optional().default(true),
})

export type SourceUrlFormInput = z.infer<typeof sourceUrlSchema>

export function parseSourceUrlFormData(formData: FormData) {
  return sourceUrlSchema.safeParse({
    title: formData.get("title"),
    url: formData.get("url"),
    category: formData.get("category") || undefined,
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  })
}
