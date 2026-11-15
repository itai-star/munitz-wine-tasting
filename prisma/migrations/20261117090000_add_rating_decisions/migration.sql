-- CreateTable
CREATE TABLE "BarrelRatingDecision" (
    "fillId" TEXT NOT NULL,
    "levels" JSONB NOT NULL,
    "decidedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarrelRatingDecision_pkey" PRIMARY KEY ("fillId")
);

-- AddForeignKey
ALTER TABLE "BarrelRatingDecision" ADD CONSTRAINT "BarrelRatingDecision_fillId_fkey" FOREIGN KEY ("fillId") REFERENCES "BarrelFill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarrelRatingDecision" ADD CONSTRAINT "BarrelRatingDecision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

