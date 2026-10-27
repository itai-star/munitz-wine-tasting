import { z } from "zod"
import type { CreditTransactionInput } from "@/lib/credit"

// Shapes of the bank's credit-card endpoints, recorded from the real site. Every value
// arrives as a string, so the parsers are strict about what they accept and skip the rest.

export type BankCard = { index: number; name: string; last4: string | null }
export type BankMonth = { month: string; isFuture: boolean }

const CardsSchema = z.object({
  body: z.object({
    bankCreditCardsList: z.array(
      z.object({
        index: z.number(),
        ccAliasName: z.string().nullish(),
        ccName: z.string().nullish(),
        cc4LastNumber: z.string().nullish(),
      })
    ),
  }),
})

const MonthsSchema = z.object({
  body: z.object({
    myCCMonthsList: z.array(z.object({ month: z.string(), isFuture: z.boolean() })),
  }),
})

const DetailsSchema = z.object({
  body: z.object({
    bankCCMonthlyDetailsList: z.array(
      z.object({
        isFuture: z.boolean(),
        creditCardIndex: z.number(),
        chargeDate: z.string(),
        transactionDate: z.string(),
        businessName: z.string(),
        CategoryNumber: z.string().nullish(),
        chargeAmount: z.string(),
        bankCCMonthlyDetailsMoreDetails: z
          .object({
            chargeDetails_category: z.string().nullish(),
            myContinuousChargeDetails: z
              .object({
                continuousChargeDetails_currentPaymentNum: z.string().nullish(),
                continuousChargeDetails_totalPaymentNum: z.string().nullish(),
              })
              .nullish(),
          })
          .nullish(),
      })
    ),
  }),
})

const MONTH_PATTERN = /^(0[1-9]|1[0-2])\d{4}$/

export function parseBankCards(payload: unknown): BankCard[] | null {
  const parsed = CardsSchema.safeParse(payload)
  if (!parsed.success) return null
  return parsed.data.body.bankCreditCardsList.map((card) => ({
    index: card.index,
    name: (card.ccAliasName || card.ccName || `כרטיס ${card.index + 1}`).trim(),
    last4: card.cc4LastNumber?.trim() || null,
  }))
}

export function parseBankMonths(payload: unknown): BankMonth[] | null {
  const parsed = MonthsSchema.safeParse(payload)
  if (!parsed.success) return null
  return parsed.data.body.myCCMonthsList.filter((entry) => MONTH_PATTERN.test(entry.month))
}

function dateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
}

function toAgorot(value: string): number | null {
  const amount = Number(value.replace(/[^\d.-]/g, ""))
  return Number.isFinite(amount) ? Math.round(amount * 100) : null
}

function integersIn(value: string | null | undefined): number[] {
  return (value?.match(/\d+/g) ?? []).map(Number)
}

// The site sometimes sends "02" / "03" and sometimes "תשלום 2 מתוך 3" for the same fields.
function parseInstallments(
  current: string | null | undefined,
  total: string | null | undefined
): { number: number; total: number } | null {
  const currentNumber = integersIn(current)[0]
  const totalNumbers = integersIn(total)
  const totalNumber = totalNumbers[totalNumbers.length - 1]
  if (!currentNumber || !totalNumber || currentNumber > totalNumber) return null
  return { number: currentNumber, total: totalNumber }
}

export type BankMonthTransaction = { cardIndex: number; transaction: CreditTransactionInput }

// One response holds the charges of every card for that month; each row says which card it
// belongs to. Charges that have not been billed yet (isFuture) are skipped: the tracker shows what
// was actually charged. They appear again, unchanged, once the bank bills them.
export function parseBankMonthDetails(payload: unknown): BankMonthTransaction[] | null {
  const parsed = DetailsSchema.safeParse(payload)
  if (!parsed.success) return null

  const transactions: BankMonthTransaction[] = []
  for (const row of parsed.data.body.bankCCMonthlyDetailsList) {
    if (row.isFuture) continue
    const transactionDate = dateOnly(row.transactionDate)
    const chargeDate = dateOnly(row.chargeDate)
    const amountAgorot = toAgorot(row.chargeAmount)
    if (!transactionDate || !chargeDate || amountAgorot === null) continue

    const continuous = row.bankCCMonthlyDetailsMoreDetails?.myContinuousChargeDetails
    const installments = parseInstallments(
      continuous?.continuousChargeDetails_currentPaymentNum,
      continuous?.continuousChargeDetails_totalPaymentNum
    )
    transactions.push({
      cardIndex: row.creditCardIndex,
      transaction: {
        transactionDate,
        chargeDate,
        description: row.businessName.trim(),
        amountAgorot,
        installmentNumber: installments?.number ?? null,
        installmentsTotal: installments?.total ?? null,
        category:
          row.bankCCMonthlyDetailsMoreDetails?.chargeDetails_category
            ?.replace(/[\u200E\u200F]/g, "")
            .trim() || null,
        categoryCode: row.CategoryNumber?.trim() || null,
      },
    })
  }
  return transactions
}
