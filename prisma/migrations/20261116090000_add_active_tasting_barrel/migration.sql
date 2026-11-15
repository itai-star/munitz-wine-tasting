-- CreateTable
CREATE TABLE "BlendTastingState" (
    "year" INTEGER NOT NULL,
    "activeFillId" TEXT,
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "BlendTastingState_pkey" PRIMARY KEY ("year")
);

-- AddForeignKey
ALTER TABLE "BlendTastingState" ADD CONSTRAINT "BlendTastingState_activeFillId_fkey" FOREIGN KEY ("activeFillId") REFERENCES "BarrelFill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

