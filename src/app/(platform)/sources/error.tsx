"use client"

import { useEffect } from "react"

import { PageHeader } from "@/components/shared/page-header"
import { SourcesError } from "@/components/sources/sources-error"

export default function SourcesRouteError({
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
      ? "Veritabanına bağlanılamadı. PostgreSQL'in çalıştığından ve DATABASE_URL'in doğru olduğundan emin olun."
      : error.message || "Kaynaklar yüklenirken bir hata oluştu."

  return (
    <>
      <PageHeader title="Kaynaklar" description="URL tabanlı içerik kaynaklarını yönetin" />
      <SourcesError message={message} />
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
