-- CreateEnum
CREATE TYPE "MemeStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Meme" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ocrText" TEXT NOT NULL DEFAULT '',
    "status" "MemeStatus" NOT NULL DEFAULT 'PROCESSING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Meme_status_idx" ON "Meme"("status");

-- CreateIndex
CREATE INDEX "Meme_createdAt_idx" ON "Meme"("createdAt");
