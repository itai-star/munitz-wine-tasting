-- CreateTable
CREATE TABLE "RemoteSensorSample" (
    "id" TEXT NOT NULL,
    "sensorKey" TEXT NOT NULL,
    "sensorName" TEXT NOT NULL,
    "temperatureC" DOUBLE PRECISION,
    "humidityPercent" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RemoteSensorSample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RemoteSensorSample_sensorKey_recordedAt_idx" ON "RemoteSensorSample"("sensorKey", "recordedAt");
