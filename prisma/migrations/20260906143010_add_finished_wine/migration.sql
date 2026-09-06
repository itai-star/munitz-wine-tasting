-- CreateTable
CREATE TABLE "FinishedWine" (
    "id" TEXT NOT NULL,
    "vintageId" TEXT NOT NULL,
    "tank" TEXT NOT NULL,
    "harvestedWeightKg" INTEGER NOT NULL,
    "litersAfterPressing" INTEGER,
    "litersAfterFirstRacking" INTEGER,
    "litersAfterSecondRacking" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinishedWine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinishedWine_vintageId_idx" ON "FinishedWine"("vintageId");

-- AddForeignKey
ALTER TABLE "FinishedWine" ADD CONSTRAINT "FinishedWine_vintageId_fkey" FOREIGN KEY ("vintageId") REFERENCES "Vintage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
