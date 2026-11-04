-- AlterEnum
ALTER TYPE "Permission" ADD VALUE 'PROCUREMENT';

-- AlterTable
ALTER TABLE "BarrelLabTest" ADD COLUMN     "freeBisulfite" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "BarrelYearFlag" (
    "id" TEXT NOT NULL,
    "barrelId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "includeInBottling" BOOLEAN NOT NULL DEFAULT true,
    "lastRound" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BarrelYearFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BarrelYearFlag_barrelId_year_key" ON "BarrelYearFlag"("barrelId", "year");

-- AddForeignKey
ALTER TABLE "BarrelYearFlag" ADD CONSTRAINT "BarrelYearFlag_barrelId_fkey" FOREIGN KEY ("barrelId") REFERENCES "Barrel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

