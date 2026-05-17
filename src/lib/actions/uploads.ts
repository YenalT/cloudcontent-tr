"use server"

import { revalidatePath } from "next/cache"
import { UploadedDocumentStatus, Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { processDocumentExtraction } from "@/lib/document-intelligence/process-document-extraction"
import { getStorageService, getStorageServiceAsync } from "@/lib/storage"
import { parseUploadTopic, validateUploadFile } from "@/lib/validations/upload"

export type UploadActionState = {
  ok: boolean
  message?: string
  fieldErrors?: Record<string, string[]>
}

function prismaErrorMessage(error: unknown): string {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Veritabanına bağlanılamadı. PostgreSQL ve DATABASE_URL ayarını kontrol edin."
  }
  return "Beklenmeyen bir hata oluştu."
}

export async function uploadDocument(
  _prev: UploadActionState,
  formData: FormData
): Promise<UploadActionState> {
  const topicParsed = parseUploadTopic(formData)
  if (!topicParsed.success) {
    return {
      ok: false,
      message: "Lütfen formu kontrol edin.",
      fieldErrors: topicParsed.error.flatten().fieldErrors,
    }
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return { ok: false, message: "Dosya seçilmedi." }
  }

  const fileValidation = validateUploadFile(file)
  if (!fileValidation.ok) {
    return { ok: false, message: fileValidation.errors.join(" ") }
  }

  const storage = await getStorageServiceAsync()
  let documentId: string | null = null

  try {
    const document = await prisma.uploadedDocument.create({
      data: {
        fileName: file.name,
        fileType: fileValidation.extension,
        fileUrl: "",
        topic: topicParsed.data.topic,
        status: UploadedDocumentStatus.PROCESSING,
        fileSizeBytes: file.size,
      },
    })
    documentId = document.id

    const buffer = Buffer.from(await file.arrayBuffer())
    const stored = await storage.upload({
      buffer,
      fileName: file.name,
      mimeType: fileValidation.mimeType,
      documentId: document.id,
    })

    await prisma.uploadedDocument.update({
      where: { id: document.id },
      data: {
        fileUrl: stored.publicUrl,
        storageKey: stored.storageKey,
        fileSizeBytes: buffer.length,
      },
    })

    const extraction = await processDocumentExtraction({
      documentId: document.id,
      buffer,
      mimeType: fileValidation.mimeType,
      fileName: file.name,
      topic: topicParsed.data.topic,
    })

    if (!extraction.ok) {
      revalidatePath("/uploads")
      return {
        ok: false,
        message: extraction.message,
      }
    }

    revalidatePath("/uploads")
    revalidatePath("/articles/new")
    return { ok: true, message: "Dosya yüklendi ve metin çıkarımı tamamlandı." }
  } catch (error) {
    if (documentId) {
      await prisma.uploadedDocument
        .update({
          where: { id: documentId },
          data: { status: UploadedDocumentStatus.FAILED },
        })
        .catch(() => null)
    }
    return { ok: false, message: prismaErrorMessage(error) }
  }
}

export async function deleteUploadedDocument(id: string): Promise<UploadActionState> {
  try {
    const doc = await prisma.uploadedDocument.findUnique({ where: { id } })
    if (!doc) {
      return { ok: false, message: "Dosya bulunamadı." }
    }

    if (doc.storageKey) {
      const storage = getStorageService()
      await storage.delete(doc.storageKey)
    }

    await prisma.uploadedDocument.delete({ where: { id } })
    revalidatePath("/uploads")
    return { ok: true, message: "Dosya silindi." }
  } catch (error) {
    return { ok: false, message: prismaErrorMessage(error) }
  }
}
