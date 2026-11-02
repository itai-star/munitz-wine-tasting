-- AlterEnum
ALTER TYPE "Permission" ADD VALUE 'EVENTS';

-- CreateTable
CREATE TABLE "EventCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventCategory_name_key" ON "EventCategory"("name");

-- CreateIndex
CREATE INDEX "CalendarEvent_date_idx" ON "CalendarEvent"("date");

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EventCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- The kinds of event known so far.
INSERT INTO "EventCategory" ("id", "name", "color", "sortOrder") VALUES
  ('event-cat-organic-green', 'אורגני גרין', '#166534', 1),
  ('event-cat-festival', 'פסטיבל', '#c2410c', 2),
  ('event-cat-tasting-workshop', 'סדנת טעימות', '#1d4ed8', 3),
  ('event-cat-wine-meat', 'ערב יין ובשר', '#722F37', 4);
