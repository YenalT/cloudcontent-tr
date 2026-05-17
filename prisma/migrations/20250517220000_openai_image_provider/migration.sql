-- CreateEnum
CREATE TYPE "ImageGenerationProvider" AS ENUM ('MOCK', 'OPENAI');

-- CreateTable
CREATE TABLE "image_provider_configs" (
    "id" TEXT NOT NULL,
    "provider" "ImageGenerationProvider" NOT NULL,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "apiKeyCiphertext" TEXT,
    "apiKeyIv" TEXT,
    "apiKeyAuthTag" TEXT,
    "model" TEXT NOT NULL DEFAULT 'gpt-image-1',
    "quality" TEXT NOT NULL DEFAULT 'medium',
    "outputFormat" TEXT NOT NULL DEFAULT 'png',
    "timeoutMs" INTEGER NOT NULL DEFAULT 120000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "image_provider_configs_provider_key" ON "image_provider_configs"("provider");

-- Seed default rows
INSERT INTO "image_provider_configs" ("id", "provider", "displayName", "isActive", "updatedAt")
VALUES
  ('img_mock', 'MOCK', 'Mock Images (Development)', true, CURRENT_TIMESTAMP),
  ('img_openai', 'OPENAI', 'OpenAI GPT Image', false, CURRENT_TIMESTAMP)
ON CONFLICT ("provider") DO NOTHING;
