-- AlterEnum
ALTER TYPE "Permission" ADD VALUE 'BARRELS';

-- CreateTable
CREATE TABLE "Barrel" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "removedAt" TIMESTAMP(3),
    "removalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Barrel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Barrel_number_key" ON "Barrel"("number");

-- CreateIndex
CREATE INDEX "Barrel_removedAt_idx" ON "Barrel"("removedAt");

