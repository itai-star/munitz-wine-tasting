-- AlterTable
ALTER TABLE "FermentationBatch" ADD COLUMN     "litersAfterPressing" DOUBLE PRECISION,
ADD COLUMN     "litersAfterSettling" DOUBLE PRECISION,
ADD COLUMN     "wineType" TEXT;
