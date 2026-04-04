-- CreateEnum
CREATE TYPE "ScoutScheduleUnit" AS ENUM ('DAY', 'WEEK');

-- CreateEnum
CREATE TYPE "ScoutWeekday" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- CreateEnum
CREATE TYPE "ScoutRelevanceWindow" AS ENUM ('DAY', 'WEEK');

-- CreateEnum
CREATE TYPE "ScoutStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateTable
CREATE TABLE "scouts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "scheduleUnit" "ScoutScheduleUnit" NOT NULL,
    "scheduleInterval" INTEGER NOT NULL,
    "scheduleDayOfWeek" "ScoutWeekday",
    "scheduleTimeLocal" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "scheduleAnchorAt" TIMESTAMP(3) NOT NULL,
    "relevanceWindow" "ScoutRelevanceWindow" NOT NULL,
    "recipientEmails" JSONB NOT NULL,
    "status" "ScoutStatus" NOT NULL DEFAULT 'ACTIVE',
    "triggerScheduleId" TEXT,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastFailureAt" TIMESTAMP(3),
    "lastFailureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "scouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scouts_userId_deletedAt_idx" ON "scouts"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "scouts_userId_status_deletedAt_idx" ON "scouts"("userId", "status", "deletedAt");

-- AddForeignKey
ALTER TABLE "scouts" ADD CONSTRAINT "scouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
