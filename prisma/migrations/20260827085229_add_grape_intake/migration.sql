-- CreateTable
CREATE TABLE "GrapeIntake" (
    "id" TEXT NOT NULL,
    "vintageId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "intakeDate" TIMESTAMP(3) NOT NULL,
    "totalWeightKg" DOUBLE PRECISION NOT NULL,
    "binCount" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrapeIntake_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GrapeIntake_vintageId_blockId_idx" ON "GrapeIntake"("vintageId", "blockId");

-- AddForeignKey
ALTER TABLE "GrapeIntake" ADD CONSTRAINT "GrapeIntake_vintageId_fkey" FOREIGN KEY ("vintageId") REFERENCES "Vintage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrapeIntake" ADD CONSTRAINT "GrapeIntake_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "VineyardBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
