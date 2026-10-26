export type CreditTransactionInput = {
  transactionDate: Date
  chargeDate: Date
  description: string
  amountAgorot: number
  installmentNumber?: number | null
  installmentsTotal?: number | null
}

const MONTH_KEY_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/

export function monthKeyOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

export function parseMonthKey(value: string | undefined): { year: number; month: number } | null {
  const match = value ? MONTH_KEY_PATTERN.exec(value) : null
  return match ? { year: Number(match[1]), month: Number(match[2]) } : null
}

const HEBREW_MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
]

export function hebrewMonthName(month: number): string {
  return HEBREW_MONTHS[month - 1] ?? String(month)
}

export function formatShekels(agorot: number): string {
  return (agorot / 100).toLocaleString("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  })
}
