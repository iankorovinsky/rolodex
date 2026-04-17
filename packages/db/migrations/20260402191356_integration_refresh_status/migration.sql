-- CreateEnum
CREATE TYPE "IntegrationConnectionStatus" AS ENUM ('ACTIVE', 'REFRESH_FAILED', 'RECONNECT_REQUIRED');

-- AlterTable
ALTER TABLE "user_integrations" ADD COLUMN     "connectionStatus" "IntegrationConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "lastRefreshAt" TIMESTAMP(3),
ADD COLUMN     "lastRefreshAttemptAt" TIMESTAMP(3),
ADD COLUMN     "lastRefreshError" TEXT,
ADD COLUMN     "reauthRequiredAt" TIMESTAMP(3);
