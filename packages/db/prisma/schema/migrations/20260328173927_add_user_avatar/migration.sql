-- CreateEnum
CREATE TYPE "AvatarId" AS ENUM ('CAT', 'PANDA', 'BUNNY', 'BEAR', 'GORILLA', 'DUCK', 'GIRAFFE', 'PENGUIN', 'SHARK', 'DRAGON');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarId" "AvatarId";
