-- AlterEnum
ALTER TYPE "SocialPostStatus" ADD VALUE 'APPROVED';
ALTER TYPE "SocialPostStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "social_posts" ADD COLUMN "storyText" TEXT,
ADD COLUMN "carouselSlides" JSONB,
ADD COLUMN "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "visualDirection" TEXT,
ADD COLUMN "postImagePrompt" TEXT,
ADD COLUMN "storyImagePrompt" TEXT,
ADD COLUMN "carouselImagePrompts" JSONB,
ADD COLUMN "postImageUrl" TEXT,
ADD COLUMN "storyImageUrl" TEXT,
ADD COLUMN "carouselImageUrls" JSONB,
ADD COLUMN "postImageStorageKey" TEXT,
ADD COLUMN "storyImageStorageKey" TEXT,
ADD COLUMN "carouselImageStorageKeys" JSONB,
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "rejectedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "social_posts_articleId_platform_key" ON "social_posts"("articleId", "platform");
