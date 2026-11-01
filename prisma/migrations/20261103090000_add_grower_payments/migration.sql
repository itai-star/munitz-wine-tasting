-- CreateTable
CREATE TABLE "BlockVintagePrice" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "vintageId" TEXT NOT NULL,
    "pricePerKgAgorot" INTEGER NOT NULL,

    CONSTRAINT "BlockVintagePrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowerPaymentPlan" (
    "id" TEXT NOT NULL,
    "vintageId" TEXT NOT NULL,
    "growerId" TEXT NOT NULL,
    "firstMonth" TEXT NOT NULL,
    "installmentCount" INTEGER NOT NULL,

    CONSTRAINT "GrowerPaymentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowerInstallment" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "dueMonth" TEXT NOT NULL,
    "amountAgorot" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "GrowerInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlockVintagePrice_blockId_vintageId_key" ON "BlockVintagePrice"("blockId", "vintageId");

-- CreateIndex
CREATE UNIQUE INDEX "GrowerPaymentPlan_vintageId_growerId_key" ON "GrowerPaymentPlan"("vintageId", "growerId");

-- CreateIndex
CREATE INDEX "GrowerInstallment_dueMonth_idx" ON "GrowerInstallment"("dueMonth");

-- CreateIndex
CREATE UNIQUE INDEX "GrowerInstallment_planId_sequence_key" ON "GrowerInstallment"("planId", "sequence");

-- AddForeignKey
ALTER TABLE "BlockVintagePrice" ADD CONSTRAINT "BlockVintagePrice_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "VineyardBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockVintagePrice" ADD CONSTRAINT "BlockVintagePrice_vintageId_fkey" FOREIGN KEY ("vintageId") REFERENCES "Vintage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowerPaymentPlan" ADD CONSTRAINT "GrowerPaymentPlan_vintageId_fkey" FOREIGN KEY ("vintageId") REFERENCES "Vintage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowerPaymentPlan" ADD CONSTRAINT "GrowerPaymentPlan_growerId_fkey" FOREIGN KEY ("growerId") REFERENCES "Grower"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowerInstallment" ADD CONSTRAINT "GrowerInstallment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "GrowerPaymentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

