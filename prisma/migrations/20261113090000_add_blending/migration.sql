-- AlterTable
ALTER TABLE "BarrelFill" ADD COLUMN     "score" DOUBLE PRECISION,
ADD COLUMN     "tastingNotes" TEXT;

-- CreateTable
CREATE TABLE "BlendWine" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlendWine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlendDraw" (
    "id" TEXT NOT NULL,
    "wineId" TEXT NOT NULL,
    "fillId" TEXT NOT NULL,
    "liters" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BlendDraw_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlendWine_year_idx" ON "BlendWine"("year");

-- CreateIndex
CREATE INDEX "BlendDraw_fillId_idx" ON "BlendDraw"("fillId");

-- CreateIndex
CREATE UNIQUE INDEX "BlendDraw_wineId_fillId_key" ON "BlendDraw"("wineId", "fillId");

-- AddForeignKey
ALTER TABLE "BlendDraw" ADD CONSTRAINT "BlendDraw_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "BlendWine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlendDraw" ADD CONSTRAINT "BlendDraw_fillId_fkey" FOREIGN KEY ("fillId") REFERENCES "BarrelFill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

