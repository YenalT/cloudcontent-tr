-- CreateEnum
CREATE TYPE "InstagramAccountType" AS ENUM ('BUSINESS', 'CREATOR');

-- AlterTable instagram_accounts
ALTER TABLE "instagram_accounts" ADD COLUMN "accountType" "InstagramAccountType" NOT NULL DEFAULT 'BUSINESS',
ADD COLUMN "instagramBusinessAccountId" TEXT,
ADD COLUMN "facebookPageId" TEXT,
ADD COLUMN "facebookPageName" TEXT,
ADD COLUMN "accessTokenCiphertext" TEXT,
ADD COLUMN "accessTokenIv" TEXT,
ADD COLUMN "accessTokenAuthTag" TEXT,
ADD COLUMN "tokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "connectionMetadata" JSONB,
ADD COLUMN "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Migrate legacy accountId if present
UPDATE "instagram_accounts"
SET "instagramBusinessAccountId" = COALESCE("accountId", "id")
WHERE "instagramBusinessAccountId" IS NULL;

UPDATE "instagram_accounts"
SET "facebookPageId" = COALESCE("facebookPageId", 'legacy'),
    "accessTokenCiphertext" = COALESCE("accessTokenCiphertext", ''),
    "accessTokenIv" = COALESCE("accessTokenIv", ''),
    "accessTokenAuthTag" = COALESCE("accessTokenAuthTag", '')
WHERE "facebookPageId" IS NULL OR "accessTokenCiphertext" IS NULL;

-- Drop legacy column
ALTER TABLE "instagram_accounts" DROP COLUMN IF EXISTS "accountId";

-- Enforce required fields for new connections (legacy rows may need reconnect)
ALTER TABLE "instagram_accounts" ALTER COLUMN "instagramBusinessAccountId" SET NOT NULL;
ALTER TABLE "instagram_accounts" ALTER COLUMN "facebookPageId" SET NOT NULL;
ALTER TABLE "instagram_accounts" ALTER COLUMN "accessTokenCiphertext" SET NOT NULL;
ALTER TABLE "instagram_accounts" ALTER COLUMN "accessTokenIv" SET NOT NULL;
ALTER TABLE "instagram_accounts" ALTER COLUMN "accessTokenAuthTag" SET NOT NULL;

-- Drop old unique on accountId if exists
DROP INDEX IF EXISTS "instagram_accounts_accountId_key";

-- AlterTable social_posts
ALTER TABLE "social_posts" ADD COLUMN "externalStoryId" TEXT,
ADD COLUMN "publishError" TEXT;
