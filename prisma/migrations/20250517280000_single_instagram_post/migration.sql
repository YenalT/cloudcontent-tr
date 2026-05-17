-- AlterTable
ALTER TABLE "social_posts" ADD COLUMN "taggedUsers" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "zapier_webhook_logs" ADD COLUMN "articleId" TEXT;
ALTER TABLE "zapier_webhook_logs" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'zapier';
ALTER TABLE "zapier_webhook_logs" ADD COLUMN "requestPayloadPreview" JSONB;
ALTER TABLE "zapier_webhook_logs" ADD COLUMN "postImageUrl" TEXT;
ALTER TABLE "zapier_webhook_logs" ADD COLUMN "webhookUrlMasked" TEXT;
ALTER TABLE "zapier_webhook_logs" ADD COLUMN "responseHeaders" JSONB;
ALTER TABLE "zapier_webhook_logs" ADD COLUMN "durationMs" INTEGER;
ALTER TABLE "zapier_webhook_logs" ADD COLUMN "errorCode" TEXT;
ALTER TABLE "zapier_webhook_logs" ADD COLUMN "suggestedAction" TEXT;
