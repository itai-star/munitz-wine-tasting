-- CreateTable
CREATE TABLE "BarrelCombination" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BarrelCombination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarrelCombinationVariety" (
    "id" TEXT NOT NULL,
    "combinationId" TEXT NOT NULL,
    "variety" TEXT NOT NULL,

    CONSTRAINT "BarrelCombinationVariety_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BarrelCombinationVariety_variety_key" ON "BarrelCombinationVariety"("variety");

-- CreateIndex
CREATE INDEX "BarrelCombinationVariety_combinationId_idx" ON "BarrelCombinationVariety"("combinationId");

-- AddForeignKey
ALTER TABLE "BarrelCombinationVariety" ADD CONSTRAINT "BarrelCombinationVariety_combinationId_fkey" FOREIGN KEY ("combinationId") REFERENCES "BarrelCombination"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- The combinations approved so far.
INSERT INTO "BarrelCombination" ("id") VALUES
  ('combo-cabernet-sauvignon'),
  ('combo-cabernet-franc'),
  ('combo-syrah'),
  ('combo-marselan');

INSERT INTO "BarrelCombinationVariety" ("id", "combinationId", "variety") VALUES
  ('combo-var-1', 'combo-cabernet-sauvignon', 'קברנה סובניון'),
  ('combo-var-2', 'combo-cabernet-sauvignon', 'פטי ורדו'),
  ('combo-var-3', 'combo-cabernet-sauvignon', 'טנט'),
  ('combo-var-4', 'combo-cabernet-franc', 'קברנה פרנק'),
  ('combo-var-5', 'combo-cabernet-franc', 'מרלו'),
  ('combo-var-6', 'combo-syrah', 'פטיט סירה'),
  ('combo-var-7', 'combo-syrah', 'שיראז'),
  ('combo-var-8', 'combo-marselan', 'מרסלן'),
  ('combo-var-9', 'combo-marselan', 'ארגמן'),
  ('combo-var-10', 'combo-marselan', 'סנסאו');
