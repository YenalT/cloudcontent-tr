import { PageHeader } from "@/components/shared/page-header"
import { UploadsSkeleton } from "@/components/uploads/uploads-skeleton"

export default function UploadsLoading() {
  return (
    <>
      <PageHeader
        title="Yüklemeler"
        description="PDF, Word ve sunum dosyalarını yükleyin ve makale konusu tanımlayın"
      />
      <UploadsSkeleton />
    </>
  )
}
