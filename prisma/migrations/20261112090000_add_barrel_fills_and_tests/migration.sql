-- CreateTable
CREATE TABLE "BarrelFill" (
    "id" TEXT NOT NULL,
    "barrelId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarrelFill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarrelFillBlock" (
    "id" TEXT NOT NULL,
    "fillId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "percent" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BarrelFillBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarrelLabTest" (
    "id" TEXT NOT NULL,
    "fillId" TEXT NOT NULL,
    "testDate" TIMESTAMP(3) NOT NULL,
    "lab" TEXT,
    "density" DOUBLE PRECISION,
    "ethanol" DOUBLE PRECISION,
    "ph" DOUBLE PRECISION,
    "totalAcid" DOUBLE PRECISION,
    "volatile" DOUBLE PRECISION,
    "rsBx" DOUBLE PRECISION,
    "co2" DOUBLE PRECISION,
    "malicAcid" DOUBLE PRECISION,
    "notes" TEXT,
    "actionItems" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BarrelLabTest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BarrelFill_barrelId_year_key" ON "BarrelFill"("barrelId", "year");

-- CreateIndex
CREATE INDEX "BarrelFillBlock_blockId_idx" ON "BarrelFillBlock"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "BarrelFillBlock_fillId_blockId_key" ON "BarrelFillBlock"("fillId", "blockId");

-- CreateIndex
CREATE INDEX "BarrelLabTest_fillId_idx" ON "BarrelLabTest"("fillId");

-- AddForeignKey
ALTER TABLE "BarrelFill" ADD CONSTRAINT "BarrelFill_barrelId_fkey" FOREIGN KEY ("barrelId") REFERENCES "Barrel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarrelFillBlock" ADD CONSTRAINT "BarrelFillBlock_fillId_fkey" FOREIGN KEY ("fillId") REFERENCES "BarrelFill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarrelFillBlock" ADD CONSTRAINT "BarrelFillBlock_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "VineyardBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarrelLabTest" ADD CONSTRAINT "BarrelLabTest_fillId_fkey" FOREIGN KEY ("fillId") REFERENCES "BarrelFill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

