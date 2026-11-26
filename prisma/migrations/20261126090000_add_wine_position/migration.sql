-- AlterTable
ALTER TABLE "BlendWine" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;


-- Keep the order the wines have today: by the time each was created, within its year.
UPDATE "BlendWine" AS w
SET "position" = ordered.place
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "year" ORDER BY "createdAt", "id") - 1 AS place
  FROM "BlendWine"
) AS ordered
WHERE ordered."id" = w."id";
