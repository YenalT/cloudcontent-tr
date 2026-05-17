import { getSourceUrls } from "@/lib/data/source-urls"
import { SourcesManager } from "@/components/sources/sources-manager"

export async function SourcesList() {
  const sources = await getSourceUrls()
  return <SourcesManager sources={sources} />
}
