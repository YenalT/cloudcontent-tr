-- CreateEnum
CREATE TYPE "DocumentExtractionProvider" AS ENUM ('MOCK', 'AZURE_DOCUMENT_INTELLIGENCE');

-- CreateTable
CREATE TABLE "document_extraction_configs" (
    "id" TEXT NOT NULL,
    "provider" "DocumentExtractionProvider" NOT NULL,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "endpoint" TEXT,
    "apiKeyCiphertext" TEXT,
    "apiKeyIv" TEXT,
    "apiKeyAuthTag" TEXT,
    "apiVersion" TEXT NOT NULL DEFAULT '2024-11-30',
    "timeoutMs" INTEGER NOT NULL DEFAULT 120000,
    "pollIntervalMs" INTEGER NOT NULL DEFAULT 2000,
    "maxPollAttempts" INTEGER NOT NULL DEFAULT 90,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_extraction_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_extraction_configs_provider_key" ON "document_extraction_configs"("provider");

-- Seed default rows
INSERT INTO "document_extraction_configs" ("id", "provider", "displayName", "isActive", "updatedAt")
VALUES
  ('doc_mock', 'MOCK', 'Mock Document Extraction (Development)', false, CURRENT_TIMESTAMP),
  ('doc_azure', 'AZURE_DOCUMENT_INTELLIGENCE', 'Azure Document Intelligence', true, CURRENT_TIMESTAMP)
ON CONFLICT ("provider") DO NOTHING;
