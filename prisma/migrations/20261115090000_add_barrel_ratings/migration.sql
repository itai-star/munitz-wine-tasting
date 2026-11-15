-- CreateTable
CREATE TABLE "BlendTaster" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlendTaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarrelRating" (
    "id" TEXT NOT NULL,
    "fillId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appearanceQuality" INTEGER NOT NULL,
    "colorIntensity" INTEGER NOT NULL,
    "aromaIntensity" INTEGER NOT NULL,
    "aromaOriginality" INTEGER NOT NULL,
    "aromaQuality" INTEGER NOT NULL,
    "tasteIntensity" INTEGER NOT NULL,
    "tasteOriginality" INTEGER NOT NULL,
    "tasteQuality" INTEGER NOT NULL,
    "finish" INTEGER NOT NULL,
    "overall" INTEGER NOT NULL,
    "paramNotes" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarrelRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlendTaster_year_userId_key" ON "BlendTaster"("year", "userId");

-- CreateIndex
CREATE INDEX "BarrelRating_userId_idx" ON "BarrelRating"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BarrelRating_fillId_userId_key" ON "BarrelRating"("fillId", "userId");

-- AddForeignKey
ALTER TABLE "BlendTaster" ADD CONSTRAINT "BlendTaster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarrelRating" ADD CONSTRAINT "BarrelRating_fillId_fkey" FOREIGN KEY ("fillId") REFERENCES "BarrelFill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarrelRating" ADD CONSTRAINT "BarrelRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

