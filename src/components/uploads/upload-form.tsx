"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { FileUp, Loader2, Upload } from "lucide-react"

import { uploadDocument, type UploadActionState } from "@/lib/actions/uploads"
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  MAX_UPLOAD_BYTES,
} from "@/lib/validations/upload"
import { formatFileSize } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const initialState: UploadActionState = { ok: false }

const ACCEPT = ALLOWED_UPLOAD_EXTENSIONS.map((e) => `.${e}`).join(",")

type UploadFormProps = {
  onSuccess?: (message: string) => void
}

export function UploadForm({ onSuccess }: UploadFormProps) {
  const [state, formAction, isPending] = useActionState(uploadDocument, initialState)
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<number | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok) {
      onSuccess?.(state.message ?? "Yüklendi.")
      formRef.current?.reset()
      setSelectedName(null)
      setSelectedSize(null)
    }
  }, [state.ok, state.message, onSuccess])

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setSelectedName(file?.name ?? null)
    setSelectedSize(file?.size ?? null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="h-4 w-4" />
          Dosya yükle
        </CardTitle>
        <CardDescription>
          PDF, DOCX veya PPTX — en fazla {formatFileSize(MAX_UPLOAD_BYTES)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Makale konusu</Label>
            <Input
              id="topic"
              name="topic"
              placeholder="Örn. Azure güvenliği, Kubernetes maliyet optimizasyonu"
              disabled={isPending}
              required
            />
            <p className="text-xs text-muted-foreground">
              Üretilecek makalenin hedef konusunu tanımlayın.
            </p>
            {state.fieldErrors?.topic?.[0] ? (
              <p className="text-xs text-destructive">{state.fieldErrors.topic[0]}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Dosya</Label>
            <div className="flex flex-col gap-3 rounded-lg border border-dashed p-6">
              <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                <FileUp className="h-8 w-8" />
                <span>
                  {selectedName
                    ? `${selectedName}${selectedSize != null ? ` (${formatFileSize(selectedSize)})` : ""}`
                    : "Dosya seçin veya sürükleyin"}
                </span>
              </div>
              <Input
                id="file"
                name="file"
                type="file"
                accept={ACCEPT}
                className="cursor-pointer"
                disabled={isPending}
                required
                onChange={onFileChange}
              />
            </div>
          </div>

          {state.message && !state.ok ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.message}
            </p>
          ) : null}

          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Yükle
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
