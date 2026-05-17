import { z } from "zod"

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024 // 25 MB

export const ALLOWED_UPLOAD_EXTENSIONS = ["pdf", "docx", "pptx"] as const

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const

export type AllowedUploadExtension = (typeof ALLOWED_UPLOAD_EXTENSIONS)[number]

const extensionSchema = z.enum(ALLOWED_UPLOAD_EXTENSIONS)

export const uploadTopicSchema = z.object({
  topic: z
    .string()
    .min(2, "Konu en az 2 karakter olmalı")
    .max(200, "Konu en fazla 200 karakter olabilir"),
})

export function getExtension(fileName: string): string | null {
  const parts = fileName.split(".")
  if (parts.length < 2) return null
  return parts.pop()?.toLowerCase() ?? null
}

export function validateUploadFile(file: File) {
  const errors: string[] = []

  if (!file || file.size === 0) {
    return { ok: false as const, errors: ["Dosya seçilmedi."] }
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    errors.push(`Dosya boyutu en fazla ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB olabilir.`)
  }

  const ext = getExtension(file.name)
  const extResult = ext ? extensionSchema.safeParse(ext) : { success: false }

  if (!extResult.success) {
    errors.push("Yalnızca PDF, DOCX ve PPTX dosyaları yüklenebilir.")
  }

  if (file.type && !ALLOWED_UPLOAD_MIME_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number])) {
    // Some browsers omit MIME — extension check is primary
    if (!extResult.success) {
      errors.push("Geçersiz dosya türü.")
    }
  }

  if (errors.length > 0) {
    return { ok: false as const, errors }
  }

  return {
    ok: true as const,
    extension: ext as AllowedUploadExtension,
    mimeType: file.type || mimeFromExtension(ext as AllowedUploadExtension),
  }
}

function mimeFromExtension(ext: AllowedUploadExtension) {
  const map: Record<AllowedUploadExtension, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  }
  return map[ext]
}

export function parseUploadTopic(formData: FormData) {
  return uploadTopicSchema.safeParse({
    topic: formData.get("topic"),
  })
}
