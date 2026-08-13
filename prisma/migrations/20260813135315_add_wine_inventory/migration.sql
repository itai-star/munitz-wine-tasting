-- AlterTable
ALTER TABLE "Wine" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "WineWithdrawal" (
    "id" TEXT NOT NULL,
    "wineId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WineWithdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wine_barcode_key" ON "Wine"("barcode");

-- AddForeignKey
ALTER TABLE "WineWithdrawal" ADD CONSTRAINT "WineWithdrawal_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "Wine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

