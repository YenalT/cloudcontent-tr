-- AlterTable
ALTER TABLE "uploaded_documents" ADD COLUMN IF NOT EXISTS "fileSizeBytes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "uploaded_documents" ADD COLUMN IF NOT EXISTS "storageKey" TEXT;
