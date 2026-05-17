"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { parseSourceUrlFormData } from "@/lib/validations/source-url"

export type SourceUrlActionState = {
  ok: boolean
  message?: string
  fieldErrors?: Record<string, string[]>
}

function fieldErrorsFromZod(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return error.flatten().fieldErrors
}

function prismaErrorMessage(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "Bu URL zaten kayıtlı."
    if (error.code === "P2025") return "Kaynak bulunamadı."
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Veritabanına bağlanılamadı. PostgreSQL ve DATABASE_URL ayarını kontrol edin."
  }
  return "Beklenmeyen bir hata oluştu."
}

export async function createSourceUrl(
  _prev: SourceUrlActionState,
  formData: FormData
): Promise<SourceUrlActionState> {
  const parsed = parseSourceUrlFormData(formData)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Lütfen formu kontrol edin.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    }
  }

  try {
    await prisma.sourceUrl.create({ data: parsed.data })
    revalidatePath("/sources")
    return { ok: true, message: "Kaynak URL eklendi." }
  } catch (error) {
    return { ok: false, message: prismaErrorMessage(error) }
  }
}

export async function updateSourceUrl(
  id: string,
  _prev: SourceUrlActionState,
  formData: FormData
): Promise<SourceUrlActionState> {
  const parsed = parseSourceUrlFormData(formData)
  if (!parsed.success) {
    return {
      ok: false,
      message: "Lütfen formu kontrol edin.",
      fieldErrors: fieldErrorsFromZod(parsed.error),
    }
  }

  try {
    await prisma.sourceUrl.update({
      where: { id },
      data: parsed.data,
    })
    revalidatePath("/sources")
    return { ok: true, message: "Kaynak URL güncellendi." }
  } catch (error) {
    return { ok: false, message: prismaErrorMessage(error) }
  }
}

export async function deleteSourceUrl(id: string): Promise<SourceUrlActionState> {
  try {
    await prisma.sourceUrl.delete({ where: { id } })
    revalidatePath("/sources")
    return { ok: true, message: "Kaynak URL silindi." }
  } catch (error) {
    return { ok: false, message: prismaErrorMessage(error) }
  }
}

export async function toggleSourceUrlActive(
  id: string,
  isActive: boolean
): Promise<SourceUrlActionState> {
  const parsed = z.boolean().safeParse(isActive)
  if (!parsed.success) {
    return { ok: false, message: "Geçersiz durum." }
  }

  try {
    await prisma.sourceUrl.update({
      where: { id },
      data: { isActive: parsed.data },
    })
    revalidatePath("/sources")
    return {
      ok: true,
      message: parsed.data ? "Kaynak etkinleştirildi." : "Kaynak devre dışı bırakıldı.",
    }
  } catch (error) {
    return { ok: false, message: prismaErrorMessage(error) }
  }
}
