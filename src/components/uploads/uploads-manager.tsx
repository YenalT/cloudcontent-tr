"use client"

import { useState } from "react"
import { FileText } from "lucide-react"

import type { UploadedDocumentListItem } from "@/lib/data/uploads"
import { EmptyState } from "@/components/shared/empty-state"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UploadForm } from "@/components/uploads/upload-form"
import { UploadsTable } from "@/components/uploads/uploads-table"

type UploadsManagerProps = {
  documents: UploadedDocumentListItem[]
}

export function UploadsManager({ documents }: UploadsManagerProps) {
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null)

  return (
    <div className="grid gap-6 p-4 md:p-6 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <UploadForm
          onSuccess={(message) => setBanner({ type: "success", text: message })}
        />
      </div>

      <div className="space-y-4 lg:col-span-3">
        {banner ? (
          <p
            className={
              banner.type === "success"
                ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                : "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            }
            role="status"
          >
            {banner.text}
          </p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Yüklenen dosyalar</CardTitle>
            <CardDescription>{documents.length} kayıt</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {documents.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Henüz dosya yok"
                description="Soldaki formdan PDF, DOCX veya PPTX yükleyin."
              />
            ) : (
              <UploadsTable
                documents={documents}
                onActionMessage={(text, type) => setBanner({ type, text })}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
