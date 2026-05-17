-- CreateEnum
CREATE TYPE "SocialAssetGenerationType" AS ENUM ('POST', 'STORY', 'CAROUSEL');

-- CreateEnum
CREATE TYPE "SocialAssetUploadStatus" AS ENUM ('PENDING', 'UPLOADING', 'UPLOADED', 'FAILED');

-- CreateTable
CREATE TABLE "social_assets" (
    "id" TEXT NOT NULL,
    "socialPostId" TEXT NOT NULL,
    "assetKey" TEXT NOT NULL,
    "generationType" "SocialAssetGenerationType" NOT NULL,
    "blobPath" TEXT,
    "publicUrl" TEXT,
    "mimeType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadStatus" "SocialAssetUploadStatus" NOT NULL DEFAULT 'PENDING',
    "uploadError" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_asset_upload_logs" (
    "id" TEXT NOT NULL,
    "socialPostId" TEXT NOT NULL,
    "socialAssetId" TEXT,
    "assetKey" TEXT,
    "status" "JobStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_asset_upload_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_assets_socialPostId_assetKey_key" ON "social_assets"("socialPostId", "assetKey");

-- CreateIndex
CREATE INDEX "social_assets_socialPostId_idx" ON "social_assets"("socialPostId");

-- CreateIndex
CREATE INDEX "social_assets_uploadStatus_idx" ON "social_assets"("uploadStatus");

-- CreateIndex
CREATE INDEX "social_asset_upload_logs_socialPostId_idx" ON "social_asset_upload_logs"("socialPostId");

-- CreateIndex
CREATE INDEX "social_asset_upload_logs_createdAt_idx" ON "social_asset_upload_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "social_assets" ADD CONSTRAINT "social_assets_socialPostId_fkey" FOREIGN KEY ("socialPostId") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_asset_upload_logs" ADD CONSTRAINT "social_asset_upload_logs_socialPostId_fkey" FOREIGN KEY ("socialPostId") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
