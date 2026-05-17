-- AlterTable
ALTER TABLE "social_assets" ADD COLUMN "detectedMimeType" TEXT;
ALTER TABLE "social_assets" ADD COLUMN "fileSizeBytes" INTEGER;
ALTER TABLE "social_assets" ADD COLUMN "width" INTEGER;
ALTER TABLE "social_assets" ADD COLUMN "height" INTEGER;
ALTER TABLE "social_assets" ADD COLUMN "blobValidationOk" BOOLEAN;
ALTER TABLE "social_assets" ADD COLUMN "blobValidationMessage" TEXT;

-- Default OpenAI output to JPEG for better Instagram/Meta compatibility
UPDATE "image_provider_configs" SET "outputFormat" = 'jpeg' WHERE "outputFormat" = 'png';
