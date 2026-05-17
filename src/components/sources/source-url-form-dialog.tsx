"use client"

import { useActionState, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import {
  createSourceUrl,
  updateSourceUrl,
  type SourceUrlActionState,
} from "@/lib/actions/source-urls"
import type { SourceUrlListItem } from "@/lib/data/source-urls"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

const initialState: SourceUrlActionState = { ok: false }

type SourceUrlFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  source?: SourceUrlListItem | null
  onSuccess?: (message: string) => void
}

export function SourceUrlFormDialog({
  open,
  onOpenChange,
  source,
  onSuccess,
}: SourceUrlFormDialogProps) {
  const isEdit = Boolean(source)
  const [isActive, setIsActive] = useState(source?.isActive ?? true)

  const boundAction = isEdit && source
    ? updateSourceUrl.bind(null, source.id)
    : createSourceUrl

  const [state, formAction, isPending] = useActionState(boundAction, initialState)

  useEffect(() => {
    if (open) {
      setIsActive(source?.isActive ?? true)
    }
  }, [open, source?.isActive])

  useEffect(() => {
    if (state.ok) {
      onSuccess?.(state.message ?? "Kaydedildi.")
      onOpenChange(false)
    }
  }, [state.ok, state.message, onOpenChange, onSuccess])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" key={source?.id ?? "new"}>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Kaynağı düzenle" : "Yeni kaynak URL"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Kaynak bilgilerini güncelleyin."
              : "İçerik üretimi için bir blog veya dokümantasyon URL'si ekleyin."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />

          <div className="space-y-2">
            <Label htmlFor="title">Başlık</Label>
            <Input
              id="title"
              name="title"
              defaultValue={source?.title ?? ""}
              placeholder="Azure OpenAI Service"
              disabled={isPending}
            />
            {state.fieldErrors?.title?.[0] ? (
              <p className="text-xs text-destructive">{state.fieldErrors.title[0]}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              name="url"
              type="url"
              defaultValue={source?.url ?? ""}
              placeholder="https://example.com/blog/post"
              disabled={isPending}
            />
            {state.fieldErrors?.url?.[0] ? (
              <p className="text-xs text-destructive">{state.fieldErrors.url[0]}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Kategori (opsiyonel)</Label>
            <Input
              id="category"
              name="category"
              defaultValue={source?.category ?? ""}
              placeholder="AI, Security, …"
              disabled={isPending}
            />
            {state.fieldErrors?.category?.[0] ? (
              <p className="text-xs text-destructive">{state.fieldErrors.category[0]}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="isActive-switch">Aktif</Label>
              <p className="text-xs text-muted-foreground">
                Pasif kaynaklar içerik çekiminde kullanılmaz.
              </p>
            </div>
            <Switch
              id="isActive-switch"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isPending}
            />
          </div>

          {state.message && !state.ok ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.message}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              İptal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? "Güncelle" : "Ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
