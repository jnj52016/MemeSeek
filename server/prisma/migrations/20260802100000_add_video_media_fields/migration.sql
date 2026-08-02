-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- AlterTable
ALTER TABLE "Meme"
ADD COLUMN "mediaType" "MediaType" NOT NULL DEFAULT 'IMAGE',
ADD COLUMN "mimeType" TEXT,
ADD COLUMN "thumbnailUrl" TEXT,
ADD COLUMN "duration" DOUBLE PRECISION,
ADD COLUMN "transcript" TEXT NOT NULL DEFAULT '';
