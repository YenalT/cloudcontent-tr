-- AlterTable
ALTER TABLE "social_posts" ADD COLUMN "imageStylePreset" TEXT NOT NULL DEFAULT 'cinematic_tech';

-- Default OpenAI image quality to high
ALTER TABLE "image_provider_configs" ALTER COLUMN "quality" SET DEFAULT 'high';

UPDATE "image_provider_configs"
SET "quality" = 'high'
WHERE "provider" = 'OPENAI' AND "quality" = 'medium';
