import { Suspense } from "react"

import { PageHeader } from "@/components/shared/page-header"
import { UploadsList } from "@/components/uploads/uploads-list"
import { UploadsSkeleton } from "@/components/uploads/uploads-skeleton"

export const dynamic = "force-dynamic"

export default function UploadsPage() {
  return (
    <>
      <PageHeader
        title="Yüklemeler"
        description="PDF, Word ve sunum dosyalarını yükleyin ve makale konusu tanımlayın"
      />
      <Suspense fallback={<UploadsSkeleton />}>
        <UploadsList />
      </Suspense>
    </>
  )
}
