-- AlterEnum
ALTER TYPE "Permission" ADD VALUE 'SALES';

-- CreateTable
CREATE TABLE "SalesMonth" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "bottles" INTEGER NOT NULL,
    "wineRevenueAgorot" INTEGER NOT NULL,
    "sourceFile" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesMonth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesSale" (
    "id" TEXT NOT NULL,
    "monthId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerType" TEXT,
    "bottles" INTEGER NOT NULL,
    "revenueAgorot" INTEGER NOT NULL,

    CONSTRAINT "SalesSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesSaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "wine" TEXT NOT NULL,
    "bottles" INTEGER NOT NULL,
    "revenueAgorot" INTEGER NOT NULL,

    CONSTRAINT "SalesSaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesCustomerRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerType" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesCustomerRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesMonth_year_month_key" ON "SalesMonth"("year", "month");

-- CreateIndex
CREATE INDEX "SalesSale_monthId_idx" ON "SalesSale"("monthId");

-- CreateIndex
CREATE INDEX "SalesSale_name_idx" ON "SalesSale"("name");

-- CreateIndex
CREATE INDEX "SalesSaleItem_saleId_idx" ON "SalesSaleItem"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesCustomerRule_name_key" ON "SalesCustomerRule"("name");

-- AddForeignKey
ALTER TABLE "SalesSale" ADD CONSTRAINT "SalesSale_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "SalesMonth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesSaleItem" ADD CONSTRAINT "SalesSaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "SalesSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

