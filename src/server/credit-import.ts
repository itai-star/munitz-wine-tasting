import { createHash } from "crypto"
import { prisma } from "@/lib/prisma"
import type { CreditTransactionInput } from "@/lib/credit"

// Two real purchases can share date, amount and merchant, so identical rows within one
// batch get an occurrence index; re-importing the same rows then yields the same keys.
function buildDedupeKeys(transactions: CreditTransactionInput[]): string[] {
  const seen = new Map<string, number>()
  return transactions.map((txn) => {
    const base = [
      txn.transactionDate.toISOString().slice(0, 10),
      txn.chargeDate.toISOString().slice(0, 10),
      txn.description.trim(),
      txn.amountAgorot,
      txn.installmentNumber ?? "",
      txn.installmentsTotal ?? "",
    ].join("|")
    const occurrence = seen.get(base) ?? 0
    seen.set(base, occurrence + 1)
    return createHash("sha256").update(`${base}|${occurrence}`).digest("hex")
  })
}

// Used by every import path (file upload, bank pull). Rows already stored for the card
// are skipped, so overlapping imports never double-count a charge.
export async function saveCreditTransactions(
  cardId: string,
  transactions: CreditTransactionInput[]
): Promise<{ added: number; skipped: number }> {
  const keys = buildDedupeKeys(transactions)
  const result = await prisma.creditTransaction.createMany({
    data: transactions.map((txn, index) => ({
      cardId,
      transactionDate: txn.transactionDate,
      chargeDate: txn.chargeDate,
      description: txn.description.trim(),
      amountAgorot: txn.amountAgorot,
      installmentNumber: txn.installmentNumber ?? null,
      installmentsTotal: txn.installmentsTotal ?? null,
      category: txn.category ?? null,
      categoryCode: txn.categoryCode ?? null,
      dedupeKey: keys[index],
    })),
    skipDuplicates: true,
  })

  // Rows saved before categories were captured get their category filled in on the next pull.
  const backfills = transactions.flatMap((txn, index) =>
    txn.category || txn.categoryCode
      ? [
          prisma.creditTransaction.updateMany({
            where: { cardId, dedupeKey: keys[index], category: null, categoryCode: null },
            data: { category: txn.category ?? null, categoryCode: txn.categoryCode ?? null },
          }),
        ]
      : []
  )
  if (backfills.length > 0) await prisma.$transaction(backfills)

  return { added: result.count, skipped: transactions.length - result.count }
}
