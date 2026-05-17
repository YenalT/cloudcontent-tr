-- AlterEnum
ALTER TYPE "SocialPostStatus" ADD VALUE 'SENT_TO_ZAPIER';

-- CreateTable
CREATE TABLE "zapier_integration_configs" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "displayName" TEXT NOT NULL DEFAULT 'Zapier',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "webhookUrlCiphertext" TEXT,
    "webhookUrlIv" TEXT,
    "webhookUrlAuthTag" TEXT,
    "timeoutMs" INTEGER NOT NULL DEFAULT 30000,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zapier_integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zapier_webhook_logs" (
    "id" TEXT NOT NULL,
    "socialPostId" TEXT NOT NULL,
    "requestPayload" JSONB NOT NULL,
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "zapier_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "zapier_webhook_logs_socialPostId_idx" ON "zapier_webhook_logs"("socialPostId");

-- CreateIndex
CREATE INDEX "zapier_webhook_logs_sentAt_idx" ON "zapier_webhook_logs"("sentAt");

-- AddForeignKey
ALTER TABLE "zapier_webhook_logs" ADD CONSTRAINT "zapier_webhook_logs_socialPostId_fkey" FOREIGN KEY ("socialPostId") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default Zapier config row
INSERT INTO "zapier_integration_configs" ("id", "displayName", "isActive", "updatedAt")
VALUES ('default', 'Zapier Integration', false, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
