-- CreateTable
CREATE TABLE "CreditAccess" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "passwordHash" TEXT NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditCard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "last4" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "chargeDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amountAgorot" INTEGER NOT NULL,
    "installmentNumber" INTEGER,
    "installmentsTotal" INTEGER,
    "dedupeKey" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditTransaction_cardId_chargeDate_idx" ON "CreditTransaction"("cardId", "chargeDate");

-- CreateIndex
CREATE UNIQUE INDEX "CreditTransaction_cardId_dedupeKey_key" ON "CreditTransaction"("cardId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "CreditCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
