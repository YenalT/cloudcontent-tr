"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ExternalLink, Loader2, Pencil, Trash2 } from "lucide-react"

import {
  deleteSourceUrl,
  toggleSourceUrlActive,
} from "@/lib/actions/source-urls"
import type { SourceUrlListItem } from "@/lib/data/source-urls"
import { formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type SourceUrlTableProps = {
  sources: SourceUrlListItem[]
  onEdit: (source: SourceUrlListItem) => void
  onActionMessage: (message: string, type: "success" | "error") => void
}

export function SourceUrlTable({ sources, onEdit, onActionMessage }: SourceUrlTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SourceUrlListItem | null>(null)

  function runAction(id: string, action: () => Promise<{ ok: boolean; message?: string }>) {
    setPendingId(id)
    startTransition(async () => {
      const result = await action()
      setPendingId(null)
      if (result.ok) {
        onActionMessage(result.message ?? "İşlem başarılı.", "success")
        router.refresh()
      } else {
        onActionMessage(result.message ?? "İşlem başarısız.", "error")
      }
    })
  }

  function handleToggle(source: SourceUrlListItem, checked: boolean) {
    runAction(source.id, () => toggleSourceUrlActive(source.id, checked))
  }

  function handleDelete() {
    if (!deleteTarget) return
    runAction(deleteTarget.id, async () => {
      const result = await deleteSourceUrl(deleteTarget.id)
      if (result.ok) setDeleteTarget(null)
      return result
    })
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Başlık</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Aktif</TableHead>
            <TableHead>Makale</TableHead>
            <TableHead>Son çekim</TableHead>
            <TableHead className="text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map((source) => {
            const rowBusy = isPending && pendingId === source.id
            return (
              <TableRow key={source.id} className={!source.isActive ? "opacity-60" : undefined}>
                <TableCell className="font-medium">{source.title}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <span className="truncate">{source.url}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </TableCell>
                <TableCell>
                  {source.category ? (
                    <Badge variant="secondary">{source.category}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={source.isActive}
                      onCheckedChange={(checked) => handleToggle(source, checked)}
                      disabled={rowBusy}
                      aria-label={`${source.title} aktiflik`}
                    />
                    {rowBusy ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : null}
                  </div>
                </TableCell>
                <TableCell>{source.articleCount}</TableCell>
                <TableCell className="text-muted-foreground">
                  {source.lastFetchedAt ? formatDate(source.lastFetchedAt) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(source)}
                      disabled={rowBusy}
                      aria-label="Düzenle"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(source)}
                      disabled={rowBusy}
                      aria-label="Sil"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kaynağı sil</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.title}</strong> kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isPending}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
