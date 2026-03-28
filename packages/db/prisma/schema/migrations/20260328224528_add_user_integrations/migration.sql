-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('IMESSAGE', 'GOOGLE', 'OUTLOOK', 'GRANOLA');

-- CreateTable
CREATE TABLE "user_integrations" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "accountLabel" TEXT,
    "accountEmail" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenScope" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "lastValidatedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "disconnectedAt" TIMESTAMP(3),

    CONSTRAINT "user_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_integrations_userId_disconnectedAt_idx" ON "user_integrations"("userId", "disconnectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_integrations_userId_provider_key" ON "user_integrations"("userId", "provider");

-- AddForeignKey
ALTER TABLE "user_integrations" ADD CONSTRAINT "user_integrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
