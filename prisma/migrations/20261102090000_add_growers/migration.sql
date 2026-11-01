-- AlterEnum
ALTER TYPE "Permission" ADD VALUE 'GROWERS';

-- AlterTable
ALTER TABLE "VineyardBlock" ADD COLUMN     "growerId" TEXT,
ADD COLUMN     "pricePerKgAgorot" INTEGER;

-- CreateTable
CREATE TABLE "Grower" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Grower_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Grower_name_key" ON "Grower"("name");

-- AddForeignKey
ALTER TABLE "VineyardBlock" ADD CONSTRAINT "VineyardBlock_growerId_fkey" FOREIGN KEY ("growerId") REFERENCES "Grower"("id") ON DELETE SET NULL ON UPDATE CASCADE;

