-- CreateTable
CREATE TABLE "FreshAllocation" (
    "id" TEXT NOT NULL,
    "vintageId" TEXT NOT NULL,
    "variety" TEXT NOT NULL,
    "liters" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreshAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FreshAllocation_vintageId_idx" ON "FreshAllocation"("vintageId");

-- CreateIndex
CREATE UNIQUE INDEX "FreshAllocation_vintageId_variety_key" ON "FreshAllocation"("vintageId", "variety");

-- AddForeignKey
ALTER TABLE "FreshAllocation" ADD CONSTRAINT "FreshAllocation_vintageId_fkey" FOREIGN KEY ("vintageId") REFERENCES "Vintage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

