-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('MOCK', 'AZURE_OPENAI');

-- CreateTable
CREATE TABLE "ai_provider_configs" (
    "id" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "endpoint" TEXT,
    "apiKeyCiphertext" TEXT,
    "apiKeyIv" TEXT,
    "apiKeyAuthTag" TEXT,
    "deploymentName" TEXT,
    "apiVersion" TEXT NOT NULL DEFAULT '2024-08-01-preview',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 4096,
    "timeoutMs" INTEGER NOT NULL DEFAULT 120000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_provider_configs_provider_key" ON "ai_provider_configs"("provider");

-- Seed default rows
INSERT INTO "ai_provider_configs" ("id", "provider", "displayName", "isActive", "updatedAt")
VALUES
  ('ai_mock', 'MOCK', 'Mock AI (Development)', false, CURRENT_TIMESTAMP),
  ('ai_azure', 'AZURE_OPENAI', 'Azure OpenAI', true, CURRENT_TIMESTAMP)
ON CONFLICT ("provider") DO NOTHING;
