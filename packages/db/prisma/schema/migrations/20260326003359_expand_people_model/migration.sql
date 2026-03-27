/*
  Warnings:

  - You are about to drop the column `email` on the `people` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `people` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `people` table. All the data in the column will be lost.
  - Added the required column `firstName` to the `people` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PersonEmailDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- DropIndex
DROP INDEX "people_name_idx";

-- AlterTable
ALTER TABLE "people" DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "phone",
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "xUrl" TEXT;

-- CreateTable
CREATE TABLE "person_emails" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_email_events" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "subject" TEXT,
    "snippet" TEXT,
    "direction" "PersonEmailDirection",
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "externalId" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_email_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_calendar_events" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "source" TEXT,
    "externalId" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "person_emails_personId_idx" ON "person_emails"("personId");

-- CreateIndex
CREATE INDEX "person_emails_email_idx" ON "person_emails"("email");

-- CreateIndex
CREATE UNIQUE INDEX "person_emails_personId_email_key" ON "person_emails"("personId", "email");

-- CreateIndex
CREATE INDEX "person_email_events_personId_idx" ON "person_email_events"("personId");

-- CreateIndex
CREATE INDEX "person_email_events_occurredAt_idx" ON "person_email_events"("occurredAt");

-- CreateIndex
CREATE INDEX "person_email_events_source_externalId_idx" ON "person_email_events"("source", "externalId");

-- CreateIndex
CREATE INDEX "person_calendar_events_personId_idx" ON "person_calendar_events"("personId");

-- CreateIndex
CREATE INDEX "person_calendar_events_startsAt_idx" ON "person_calendar_events"("startsAt");

-- CreateIndex
CREATE INDEX "person_calendar_events_source_externalId_idx" ON "person_calendar_events"("source", "externalId");

-- CreateIndex
CREATE INDEX "people_firstName_idx" ON "people"("firstName");

-- CreateIndex
CREATE INDEX "people_lastName_idx" ON "people"("lastName");

-- AddForeignKey
ALTER TABLE "person_emails" ADD CONSTRAINT "person_emails_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_email_events" ADD CONSTRAINT "person_email_events_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_calendar_events" ADD CONSTRAINT "person_calendar_events_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
