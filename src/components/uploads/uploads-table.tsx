"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Download, ExternalLink, Loader2, Trash2 } from "lucide-react"

import { deleteUploadedDocument } from "@/lib/actions/uploads"
import type { UploadedDocumentListItem } from "@/lib/data/uploads"
import { formatDate } from "@/lib/utils"
import { formatFileSize } from "@/lib/utils/format"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
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

type UploadsTableProps = {
  documents: UploadedDocumentListItem[]
  onActionMessage: (message: string, type: "success" | "error") => void
}

export function UploadsTable({ documents, onActionMessage }: UploadsTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UploadedDocumentListItem | null>(null)

  function handleDelete() {
    if (!deleteTarget) return
    setPendingId(deleteTarget.id)
    startTransition(async () => {
      const result = await deleteUploadedDocument(deleteTarget.id)
      setPendingId(null)
      if (result.ok) {
        setDeleteTarget(null)
        onActionMessage(result.message ?? "Silindi.", "success")
        router.refresh()
      } else {
        onActionMessage(result.message ?? "Silinemedi.", "error")
      }
    })
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dosya</TableHead>
            <TableHead>Konu</TableHead>
            <TableHead>Tür</TableHead>
            <TableHead>Boyut</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Makale</TableHead>
            <TableHead>Tarih</TableHead>
            <TableHead className="text-right">İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const rowBusy = isPending && pendingId === doc.id
            return (
              <TableRow key={doc.id}>
                <TableCell className="max-w-[180px] truncate font-medium">{doc.fileName}</TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                  {doc.topic ?? "—"}
                </TableCell>
                <TableCell className="uppercase">{doc.fileType}</TableCell>
                <TableCell>{formatFileSize(doc.fileSizeBytes)}</TableCell>
                <TableCell>
                  <StatusBadge status={doc.status} />
                </TableCell>
                <TableCell>{doc.articleCount}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(doc.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {doc.status === "completed" && doc.fileUrl ? (
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="İndir"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="icon" asChild disabled={!doc.fileUrl}>
                      <a href={doc.fileUrl || "#"} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(doc)}
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
            <DialogTitle>Dosyayı sil</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.fileName}</strong> ve yerel kopyası kalıcı olarak silinecek.
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
