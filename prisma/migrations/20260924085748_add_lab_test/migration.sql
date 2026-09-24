-- CreateTable
CREATE TABLE "LabTest" (
    "id" TEXT NOT NULL,
    "finishedWineId" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabTest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LabTest_finishedWineId_idx" ON "LabTest"("finishedWineId");

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_finishedWineId_fkey" FOREIGN KEY ("finishedWineId") REFERENCES "FinishedWine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
