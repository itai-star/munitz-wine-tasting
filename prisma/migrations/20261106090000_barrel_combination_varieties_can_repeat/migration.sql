-- DropIndex
DROP INDEX "BarrelCombinationVariety_variety_key";

-- CreateIndex
CREATE UNIQUE INDEX "BarrelCombinationVariety_combinationId_variety_key" ON "BarrelCombinationVariety"("combinationId", "variety");

