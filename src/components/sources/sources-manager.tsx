"use client"

import { useState } from "react"
import { Link2, Plus } from "lucide-react"

import type { SourceUrlListItem } from "@/lib/data/source-urls"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SourceUrlFormDialog } from "@/components/sources/source-url-form-dialog"
import { SourceUrlTable } from "@/components/sources/source-url-table"

type SourcesManagerProps = {
  sources: SourceUrlListItem[]
}

export function SourcesManager({ sources }: SourcesManagerProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SourceUrlListItem | null>(null)
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(source: SourceUrlListItem) {
    setEditing(source)
    setFormOpen(true)
  }

  function handleSuccess(message: string) {
    setBanner({ type: "success", text: message })
  }

  function handleActionMessage(text: string, type: "success" | "error") {
    setBanner({ type, text })
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          URL Ekle
        </Button>
      </div>

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
          <CardTitle>Kaynak URL listesi</CardTitle>
          <CardDescription>
            {sources.length} kayıt — veritabanından yükleniyor
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {sources.length === 0 ? (
            <EmptyState
              icon={Link2}
              title="Kaynak yok"
              description="İçerik üretmek için bir kaynak URL ekleyin."
              action={
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" />
                  İlk kaynağı ekle
                </Button>
              }
            />
          ) : (
            <SourceUrlTable
              sources={sources}
              onEdit={openEdit}
              onActionMessage={handleActionMessage}
            />
          )}
        </CardContent>
      </Card>

      <SourceUrlFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        source={editing}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
