-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "allowedBy" TEXT,
ADD COLUMN     "blocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "blockedBy" TEXT;
