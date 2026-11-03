-- A barrel number is unique among the barrels in stock only, so the number of a barrel that left the stock
-- can be given to a new barrel. A partial index is not something the schema file can describe.

-- DropIndex
DROP INDEX "Barrel_number_key";

-- CreateIndex
CREATE INDEX "Barrel_number_idx" ON "Barrel"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Barrel_number_in_stock_key" ON "Barrel"("number") WHERE "removedAt" IS NULL;
