import { prisma } from "@/lib/prisma"
import { hebrewMonthName, monthKeyOf, parseMonthKey } from "@/lib/credit"

const CARD_COLORS = ["#722F37", "#0f766e", "#a16207", "#1d4ed8"]

export type CreditCardInfo = { id: string; name: string; last4: string | null; color: string }

export type CreditTransactionRow = {
  id: string
  cardId: string
  transactionDate: string
  chargeDate: string
  description: string
  amountAgorot: number
  installmentNumber: number | null
  installmentsTotal: number | null
}

export type YearlyMonthRow = {
  month: number
  label: string
  total: number
  byCard: Record<string, number>
}

export type CreditOverview = {
  cards: CreditCardInfo[]
  availableMonths: string[]
  availableYears: number[]
  year: number
  selectedMonth: string | null
  selectedCardId: string | null
  transactions: CreditTransactionRow[]
  monthTotalAgorot: number
  yearly: YearlyMonthRow[]
}

type Selection = { month?: string; card?: string; year?: string }

function monthRange(year: number, month: number): { gte: Date; lt: Date } {
  return { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) }
}

async function loadYearly(year: number, cards: CreditCardInfo[]): Promise<YearlyMonthRow[]> {
  const rows = await prisma.creditTransaction.findMany({
    where: { chargeDate: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } },
    select: { cardId: true, chargeDate: true, amountAgorot: true },
  })

  const months: YearlyMonthRow[] = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    label: hebrewMonthName(index + 1),
    total: 0,
    byCard: Object.fromEntries(cards.map((card) => [card.id, 0])),
  }))
  for (const row of rows) {
    const target = months[row.chargeDate.getUTCMonth()]
    target.total += row.amountAgorot
    target.byCard[row.cardId] = (target.byCard[row.cardId] ?? 0) + row.amountAgorot
  }
  return months
}

function resolveSelection(
  selection: Selection,
  cards: CreditCardInfo[],
  availableMonths: string[]
): { selectedMonth: string | null; selectedCardId: string | null; year: number } {
  const requestedMonth = parseMonthKey(selection.month) ? selection.month! : null
  const selectedMonth =
    requestedMonth && availableMonths.includes(requestedMonth)
      ? requestedMonth
      : (availableMonths[0] ?? null)

  const availableYears = availableMonths.map((key) => Number(key.slice(0, 4)))
  const requestedYear = Number(selection.year)
  const year = availableYears.includes(requestedYear)
    ? requestedYear
    : selectedMonth
      ? Number(selectedMonth.slice(0, 4))
      : new Date().getFullYear()

  const selectedCardId = cards.some((card) => card.id === selection.card) ? selection.card! : null
  return { selectedMonth, selectedCardId, year }
}

export async function loadCreditOverview(selection: Selection): Promise<CreditOverview> {
  const dbCards = await prisma.creditCard.findMany({ orderBy: { createdAt: "asc" } })
  const cards = dbCards.map((card, index) => ({
    id: card.id,
    name: card.name,
    last4: card.last4,
    color: CARD_COLORS[index % CARD_COLORS.length],
  }))

  const charged = await prisma.creditTransaction.findMany({
    distinct: ["chargeDate"],
    select: { chargeDate: true },
    orderBy: { chargeDate: "desc" },
  })
  const availableMonths = [...new Set(charged.map((row) => monthKeyOf(row.chargeDate)))]
  const availableYears = [...new Set(availableMonths.map((key) => Number(key.slice(0, 4))))]
  const { selectedMonth, selectedCardId, year } = resolveSelection(selection, cards, availableMonths)

  const parsedMonth = selectedMonth ? parseMonthKey(selectedMonth) : null
  const monthRows = parsedMonth
    ? await prisma.creditTransaction.findMany({
        where: {
          chargeDate: monthRange(parsedMonth.year, parsedMonth.month),
          ...(selectedCardId ? { cardId: selectedCardId } : {}),
        },
        orderBy: [{ transactionDate: "desc" }, { description: "asc" }],
      })
    : []

  return {
    cards,
    availableMonths,
    availableYears,
    year,
    selectedMonth,
    selectedCardId,
    transactions: monthRows.map((row) => ({
      id: row.id,
      cardId: row.cardId,
      transactionDate: row.transactionDate.toISOString(),
      chargeDate: row.chargeDate.toISOString(),
      description: row.description,
      amountAgorot: row.amountAgorot,
      installmentNumber: row.installmentNumber,
      installmentsTotal: row.installmentsTotal,
    })),
    monthTotalAgorot: monthRows.reduce((sum, row) => sum + row.amountAgorot, 0),
    yearly: await loadYearly(year, cards),
  }
}
