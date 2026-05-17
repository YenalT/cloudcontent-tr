import { Suspense } from "react"

import { PageHeader } from "@/components/shared/page-header"

export const dynamic = "force-dynamic"
import { SourcesList } from "@/components/sources/sources-list"
import { SourcesSkeleton } from "@/components/sources/sources-skeleton"

export default function SourcesPage() {
  return (
    <>
      <PageHeader
        title="Kaynaklar"
        description="URL tabanlı içerik kaynaklarını yönetin"
      />
      <Suspense fallback={<SourcesSkeleton />}>
        <SourcesList />
      </Suspense>
    </>
  )
}
