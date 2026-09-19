-- AlterTable
ALTER TABLE "FinishedWine" ADD COLUMN "blockId" TEXT;

-- CreateIndex
CREATE INDEX "FinishedWine_blockId_idx" ON "FinishedWine"("blockId");

-- AddForeignKey
ALTER TABLE "FinishedWine" ADD CONSTRAINT "FinishedWine_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "VineyardBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
