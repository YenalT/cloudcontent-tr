-- AlterEnum
ALTER TYPE "SocialAssetUploadStatus" ADD VALUE 'LOCAL_ONLY';

-- AlterTable
ALTER TABLE "social_assets" ADD COLUMN "storageProvider" TEXT;

-- CreateTable
CREATE TABLE "storage_provider_configs" (
    "id" TEXT NOT NULL,
    "providerName" TEXT NOT NULL DEFAULT 'azure_blob',
    "storageAccountName" TEXT,
    "connectionStringCiphertext" TEXT,
    "connectionStringIv" TEXT,
    "connectionStringAuthTag" TEXT,
    "containerName" TEXT NOT NULL DEFAULT 'instagram-assets',
    "publicBaseUrl" TEXT,
    "enablePublicUrls" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_provider_configs_pkey" PRIMARY KEY ("id")
);
