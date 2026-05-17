import { getUploadedDocuments } from "@/lib/data/uploads"
import { UploadsManager } from "@/components/uploads/uploads-manager"

export async function UploadsList() {
  const documents = await getUploadedDocuments()
  return <UploadsManager documents={documents} />
}
