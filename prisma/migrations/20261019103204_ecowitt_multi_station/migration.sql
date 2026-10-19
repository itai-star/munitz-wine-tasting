/*
  Warnings:

  - You are about to drop the column `mac` on the `EcowittSettings` table. All the data in the column will be lost.
  - You are about to drop the `EcowittSensorAssignment` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `stationId` to the `EcowittSample` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "EcowittSensorAssignment" DROP CONSTRAINT "EcowittSensorAssignment_blockId_fkey";

-- DropIndex
DROP INDEX "EcowittSample_sensorKey_recordedAt_idx";

-- AlterTable
ALTER TABLE "EcowittSample" ADD COLUMN     "stationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "EcowittSettings" DROP COLUMN "mac";

-- DropTable
DROP TABLE "EcowittSensorAssignment";

-- CreateTable
CREATE TABLE "EcowittStation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mac" TEXT NOT NULL,
    "blockId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EcowittStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EcowittSensorLabel" (
    "stationId" TEXT NOT NULL,
    "sensorKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "EcowittSensorLabel_pkey" PRIMARY KEY ("stationId","sensorKey")
);

-- CreateIndex
CREATE UNIQUE INDEX "EcowittStation_mac_key" ON "EcowittStation"("mac");

-- CreateIndex
CREATE INDEX "EcowittStation_blockId_idx" ON "EcowittStation"("blockId");

-- CreateIndex
CREATE INDEX "EcowittSample_stationId_sensorKey_recordedAt_idx" ON "EcowittSample"("stationId", "sensorKey", "recordedAt");

-- AddForeignKey
ALTER TABLE "EcowittStation" ADD CONSTRAINT "EcowittStation_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "VineyardBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcowittSensorLabel" ADD CONSTRAINT "EcowittSensorLabel_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "EcowittStation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcowittSample" ADD CONSTRAINT "EcowittSample_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "EcowittStation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
