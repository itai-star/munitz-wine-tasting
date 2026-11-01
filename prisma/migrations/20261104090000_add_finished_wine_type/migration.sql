-- CreateEnum
CREATE TYPE "FinishedWineType" AS ENUM ('RED', 'WHITE', 'ROSE', 'FRESH');

-- AlterTable
ALTER TABLE "FinishedWine" ADD COLUMN     "wineType" "FinishedWineType";

-- Existing records: the three white varieties are white and every other block's wine is red.
-- Rosé and fresh wines are marked by hand on the record.
UPDATE "FinishedWine" SET "wineType" = 'WHITE'
WHERE "blockId" IN (SELECT "id" FROM "VineyardBlock" WHERE "variety" IN ('קולומברד', 'שאנין בלאן', 'ויונייה'));

UPDATE "FinishedWine" SET "wineType" = 'RED'
WHERE "wineType" IS NULL AND "blockId" IS NOT NULL;
