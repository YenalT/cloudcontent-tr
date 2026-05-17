import { PageHeader } from "@/components/shared/page-header"
import { SourcesSkeleton } from "@/components/sources/sources-skeleton"

export default function SourcesLoading() {
  return (
    <>
      <PageHeader
        title="Kaynaklar"
        description="URL tabanlı içerik kaynaklarını yönetin"
      />
      <SourcesSkeleton />
    </>
  )
}
