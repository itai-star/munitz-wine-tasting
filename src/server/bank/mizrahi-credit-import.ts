import { prisma } from "@/lib/prisma"
import {
  parseBankCards,
  parseBankMonthDetails,
  parseBankMonths,
  type BankCard,
} from "@/lib/mizrahi-credit"
import { saveCreditTransactions } from "@/server/credit-import"
import { openMizrahiSession, type BankSession } from "@/server/bank/mizrahi-session"

const REQUEST_SPACING_MS = 700

export type BankImportSummary = {
  cards: number
  months: number
  added: number
  skipped: number
  byCard: { name: string; added: number }[]
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class UnexpectedBankResponse extends Error {}

// Bank cards are matched to the stored ones by their last four digits. A card that is not
// stored yet is created, so the first import needs no manual setup.
async function resolveCardIds(bankCards: BankCard[]): Promise<Map<number, string>> {
  const stored = await prisma.creditCard.findMany()
  const ids = new Map<number, string>()

  for (const bankCard of bankCards) {
    const match = bankCard.last4 ? stored.find((card) => card.last4 === bankCard.last4) : undefined
    if (match) {
      ids.set(bankCard.index, match.id)
      continue
    }
    const created = await prisma.creditCard.create({
      data: { name: bankCard.name, last4: bankCard.last4 },
    })
    stored.push(created)
    ids.set(bankCard.index, created.id)
  }
  return ids
}

export async function importFromSession(session: BankSession): Promise<BankImportSummary> {
  const bankCards = parseBankCards(await session.postJson("CC/getAllCreditCards", {}))
  const months = parseBankMonths(await session.postJson("CC/getCCMonthList", { SugBakasha: "1" }))
  if (!bankCards || !months) throw new UnexpectedBankResponse()

  const cardIds = await resolveCardIds(bankCards)
  const billedMonths = months.filter((entry) => !entry.isFuture)
  const addedByCard = new Map<number, number>()
  const summary: BankImportSummary = {
    cards: bankCards.length,
    months: billedMonths.length,
    added: 0,
    skipped: 0,
    byCard: [],
  }

  // A single request per month returns every card's charges, each tagged with its card.
  const requestCardIndex = bankCards[0]?.index ?? 0
  for (const entry of billedMonths) {
    await sleep(REQUEST_SPACING_MS)
    const rows = parseBankMonthDetails(
      await session.postJson("CC/getBankCCMonthlyDetails", {
        ccIndex: requestCardIndex,
        month: entry.month,
      })
    )
    if (!rows) throw new UnexpectedBankResponse()

    for (const card of bankCards) {
      const cardId = cardIds.get(card.index)
      const cardRows = rows.filter((row) => row.cardIndex === card.index)
      if (!cardId || cardRows.length === 0) continue
      const saved = await saveCreditTransactions(
        cardId,
        cardRows.map((row) => row.transaction)
      )
      summary.added += saved.added
      summary.skipped += saved.skipped
      addedByCard.set(card.index, (addedByCard.get(card.index) ?? 0) + saved.added)
    }
  }

  summary.byCard = bankCards.map((card) => ({
    name: card.last4 ? `${card.name} ····${card.last4}` : card.name,
    added: addedByCard.get(card.index) ?? 0,
  }))
  return summary
}

export async function runMizrahiCreditImport(credentials: {
  username: string
  password: string
}): Promise<BankImportSummary> {
  const session = await openMizrahiSession(credentials)
  try {
    return await importFromSession(session)
  } finally {
    await session.close().catch(() => undefined)
  }
}

export function isUnexpectedBankResponse(error: unknown): boolean {
  return error instanceof UnexpectedBankResponse
}
