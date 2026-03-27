/*
  Warnings:

  - You are about to drop the column `phoneNumber` on the `people` table. All the data in the column will be lost.
  - You are about to drop the `asks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `favours` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('ASK', 'FAVOUR');

-- DropForeignKey
ALTER TABLE "asks" DROP CONSTRAINT "asks_parentId_fkey";

-- DropForeignKey
ALTER TABLE "asks" DROP CONSTRAINT "asks_personId_fkey";

-- DropForeignKey
ALTER TABLE "favours" DROP CONSTRAINT "favours_parentId_fkey";

-- DropForeignKey
ALTER TABLE "favours" DROP CONSTRAINT "favours_personId_fkey";

-- AlterTable
ALTER TABLE "people" DROP COLUMN "phoneNumber",
ALTER COLUMN "firstName" DROP NOT NULL;

-- DropTable
DROP TABLE "asks";

-- DropTable
DROP TABLE "favours";

-- CreateTable
CREATE TABLE "person_phones" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_phones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_events" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "body" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sync_cursors" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "cursor" TEXT,
    "lastSuccessAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sync_cursors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_device_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "parentId" UUID,
    "type" "RequestType" NOT NULL,
    "description" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "person_phones_personId_idx" ON "person_phones"("personId");

-- CreateIndex
CREATE INDEX "person_phones_phoneNumber_idx" ON "person_phones"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "person_phones_personId_phoneNumber_key" ON "person_phones"("personId", "phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "message_events_personId_key" ON "message_events"("personId");

-- CreateIndex
CREATE INDEX "message_events_sentAt_idx" ON "message_events"("sentAt");

-- CreateIndex
CREATE INDEX "user_sync_cursors_userId_idx" ON "user_sync_cursors"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_sync_cursors_userId_source_key" ON "user_sync_cursors"("userId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "user_device_tokens_tokenHash_key" ON "user_device_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "user_device_tokens_userId_revokedAt_idx" ON "user_device_tokens"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "requests_personId_idx" ON "requests"("personId");

-- CreateIndex
CREATE INDEX "requests_type_idx" ON "requests"("type");

-- CreateIndex
CREATE INDEX "requests_completed_idx" ON "requests"("completed");

-- CreateIndex
CREATE INDEX "requests_parentId_idx" ON "requests"("parentId");

-- CreateIndex
CREATE INDEX "requests_personId_type_completed_idx" ON "requests"("personId", "type", "completed");

-- AddForeignKey
ALTER TABLE "person_phones" ADD CONSTRAINT "person_phones_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_events" ADD CONSTRAINT "message_events_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sync_cursors" ADD CONSTRAINT "user_sync_cursors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_device_tokens" ADD CONSTRAINT "user_device_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
