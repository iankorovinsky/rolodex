-- CreateTable
CREATE TABLE "people" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_tags" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "tagId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "person_notes" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asks" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "parentId" UUID,
    "description" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favours" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "parentId" UUID,
    "description" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "favours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "people_userId_idx" ON "people"("userId");

-- CreateIndex
CREATE INDEX "people_name_idx" ON "people"("name");

-- CreateIndex
CREATE INDEX "people_userId_isFavorite_idx" ON "people"("userId", "isFavorite");

-- CreateIndex
CREATE INDEX "people_userId_deletedAt_idx" ON "people"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "roles_personId_idx" ON "roles"("personId");

-- CreateIndex
CREATE INDEX "roles_title_idx" ON "roles"("title");

-- CreateIndex
CREATE INDEX "roles_company_idx" ON "roles"("company");

-- CreateIndex
CREATE INDEX "tags_userId_idx" ON "tags"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_userId_name_key" ON "tags"("userId", "name");

-- CreateIndex
CREATE INDEX "person_tags_personId_idx" ON "person_tags"("personId");

-- CreateIndex
CREATE INDEX "person_tags_tagId_idx" ON "person_tags"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "person_tags_personId_tagId_key" ON "person_tags"("personId", "tagId");

-- CreateIndex
CREATE INDEX "person_notes_personId_idx" ON "person_notes"("personId");

-- CreateIndex
CREATE INDEX "asks_personId_idx" ON "asks"("personId");

-- CreateIndex
CREATE INDEX "asks_completed_idx" ON "asks"("completed");

-- CreateIndex
CREATE INDEX "asks_parentId_idx" ON "asks"("parentId");

-- CreateIndex
CREATE INDEX "favours_personId_idx" ON "favours"("personId");

-- CreateIndex
CREATE INDEX "favours_completed_idx" ON "favours"("completed");

-- CreateIndex
CREATE INDEX "favours_parentId_idx" ON "favours"("parentId");

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_tags" ADD CONSTRAINT "person_tags_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_tags" ADD CONSTRAINT "person_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "person_notes" ADD CONSTRAINT "person_notes_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asks" ADD CONSTRAINT "asks_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asks" ADD CONSTRAINT "asks_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "asks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favours" ADD CONSTRAINT "favours_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favours" ADD CONSTRAINT "favours_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "favours"("id") ON DELETE SET NULL ON UPDATE CASCADE;
