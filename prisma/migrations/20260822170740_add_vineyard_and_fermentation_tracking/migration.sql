-- CreateTable
CREATE TABLE "Vintage" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vintage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VineyardBlock" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "elevationMeters" INTEGER,
    "slopeDirection" TEXT,
    "slopeAngleDegrees" DOUBLE PRECISION,
    "soilType" TEXT,
    "variety" TEXT NOT NULL,
    "rootstock" TEXT,
    "plantingYear" INTEGER,
    "plantingDensity" TEXT,
    "rowDirection" TEXT,
    "trellisMethod" TEXT,
    "irrigationType" TEXT,
    "estimatedYieldPerDunam" DOUBLE PRECISION,
    "diseaseHistory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VineyardBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RipenessSample" (
    "id" TEXT NOT NULL,
    "vintageId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "sampleDate" TIMESTAMP(3) NOT NULL,
    "brix" DOUBLE PRECISION,
    "ph" DOUBLE PRECISION,
    "titratableAcidity" DOUBLE PRECISION,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RipenessSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FermentationBatch" (
    "id" TEXT NOT NULL,
    "vintageId" TEXT NOT NULL,
    "tankName" TEXT NOT NULL,
    "volumeLiters" DOUBLE PRECISION,
    "yeastStrain" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FermentationBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FermentationBatchBlock" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "FermentationBatchBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FermentationReading" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "readingDate" TIMESTAMP(3) NOT NULL,
    "brix" DOUBLE PRECISION,
    "specificGravity" DOUBLE PRECISION,
    "temperatureCelsius" DOUBLE PRECISION,
    "ph" DOUBLE PRECISION,
    "yeastAdditions" TEXT,
    "cellarWork" TEXT,
    "so2Addition" TEXT,
    "tasteAromaNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FermentationReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vintage_year_key" ON "Vintage"("year");

-- CreateIndex
CREATE INDEX "RipenessSample_vintageId_blockId_idx" ON "RipenessSample"("vintageId", "blockId");

-- CreateIndex
CREATE UNIQUE INDEX "FermentationBatchBlock_batchId_blockId_key" ON "FermentationBatchBlock"("batchId", "blockId");

-- CreateIndex
CREATE UNIQUE INDEX "FermentationReading_batchId_readingDate_key" ON "FermentationReading"("batchId", "readingDate");

-- AddForeignKey
ALTER TABLE "RipenessSample" ADD CONSTRAINT "RipenessSample_vintageId_fkey" FOREIGN KEY ("vintageId") REFERENCES "Vintage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RipenessSample" ADD CONSTRAINT "RipenessSample_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "VineyardBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FermentationBatch" ADD CONSTRAINT "FermentationBatch_vintageId_fkey" FOREIGN KEY ("vintageId") REFERENCES "Vintage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FermentationBatchBlock" ADD CONSTRAINT "FermentationBatchBlock_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "FermentationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FermentationBatchBlock" ADD CONSTRAINT "FermentationBatchBlock_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "VineyardBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FermentationReading" ADD CONSTRAINT "FermentationReading_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "FermentationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
