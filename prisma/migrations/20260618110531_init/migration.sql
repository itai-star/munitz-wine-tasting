-- CreateTable
CREATE TABLE "Wine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "year" INTEGER,
    "type" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TastingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TastingSessionWine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "wineId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TastingSessionWine_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TastingSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TastingSessionWine_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "Wine" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionWineId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Rating_sessionWineId_fkey" FOREIGN KEY ("sessionWineId") REFERENCES "TastingSessionWine" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Rating_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TastingSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Impression" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Impression_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TastingSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TastingSessionWine_sessionId_wineId_key" ON "TastingSessionWine"("sessionId", "wineId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_sessionWineId_participantName_key" ON "Rating"("sessionWineId", "participantName");

-- CreateIndex
CREATE UNIQUE INDEX "Impression_sessionId_participantName_key" ON "Impression"("sessionId", "participantName");
