-- CreateTable
CREATE TABLE "EcowittSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "applicationKey" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "mac" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EcowittSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EcowittSensorAssignment" (
    "sensorKey" TEXT NOT NULL,
    "label" TEXT,
    "blockId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EcowittSensorAssignment_pkey" PRIMARY KEY ("sensorKey")
);

-- CreateTable
CREATE TABLE "EcowittSample" (
    "id" TEXT NOT NULL,
    "sensorKey" TEXT NOT NULL,
    "temperatureC" DOUBLE PRECISION,
    "humidityPercent" DOUBLE PRECISION,
    "soilMoisturePercent" DOUBLE PRECISION,
    "leafWetnessPercent" DOUBLE PRECISION,
    "rainDailyMm" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EcowittSample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EcowittSensorAssignment_blockId_idx" ON "EcowittSensorAssignment"("blockId");

-- CreateIndex
CREATE INDEX "EcowittSample_sensorKey_recordedAt_idx" ON "EcowittSample"("sensorKey", "recordedAt");

-- AddForeignKey
ALTER TABLE "EcowittSensorAssignment" ADD CONSTRAINT "EcowittSensorAssignment_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "VineyardBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;
