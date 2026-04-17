/*
  Warnings:

  - A unique constraint covering the columns `[userId,provider,externalAccountId]` on the table `user_integrations` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "user_integrations_userId_provider_key";

-- AlterTable
ALTER TABLE "user_integrations" ADD COLUMN     "externalAccountId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_integrations_userId_provider_externalAccountId_key" ON "user_integrations"("userId", "provider", "externalAccountId");
