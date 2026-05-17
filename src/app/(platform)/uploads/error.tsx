"use client"

import { useEffect } from "react"

import { PageHeader } from "@/components/shared/page-header"
import { UploadsError } from "@/components/uploads/uploads-error"

export default function UploadsRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  const message =
    error.message?.includes("connect") || error.message?.includes("DATABASE")
      ? "Veritabanına bağlanılamadı. PostgreSQL ve migration'ların uygulandığından emin olun."
      : error.message

  return (
    <>
      <PageHeader title="Yüklemeler" description="PDF, Word ve sunum dosyalarını yönetin" />
      <UploadsError message={message} />
      <div className="flex justify-center pb-6">
        <button
          type="button"
          onClick={reset}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Tekrar dene
        </button>
      </div>
    </>
  )
}
