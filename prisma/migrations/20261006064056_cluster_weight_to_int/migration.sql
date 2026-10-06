/*
  Warnings:

  - You are about to alter the column `clusterWeight` on the `RipenessSample` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "RipenessSample" ALTER COLUMN "clusterWeight" SET DATA TYPE INTEGER;
