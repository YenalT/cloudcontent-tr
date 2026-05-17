import { readFile } from "fs/promises"
import { NextResponse } from "next/server"

import { buildContentDispositionInline } from "@/lib/http/header-utils"
import { prisma } from "@/lib/prisma"
import { getLocalStorageService } from "@/lib/storage"
import { readStoredFile } from "@/lib/storage/read-file"

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params

  const doc = await prisma.uploadedDocument.findUnique({
    where: { id: documentId },
  })

  if (!doc?.storageKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (doc.fileUrl?.startsWith("https://")) {
    return NextResponse.redirect(doc.fileUrl, 302)
  }

  const local = getLocalStorageService()
  if (local) {
    try {
      const filePath = local.resolvePath(doc.storageKey)
      const buffer = await readFile(filePath)
      const contentType = MIME[doc.fileType] ?? "application/octet-stream"

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": buildContentDispositionInline(doc.fileName),
        },
      })
    } catch {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
    }
  }

  try {
    const buffer = await readStoredFile(doc.storageKey)
    const contentType = MIME[doc.fileType] ?? "application/octet-stream"

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": buildContentDispositionInline(doc.fileName),
      },
    })
  } catch {
    return NextResponse.json({ error: "File not found in storage" }, { status: 404 })
  }
}
