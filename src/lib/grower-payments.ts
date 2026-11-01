import { hebrewMonthName } from "@/lib/credit"

const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/

export function isMonthKey(value: string): boolean {
  return MONTH_KEY.test(value)
}

export function monthKeyOf(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`
}

// "2026-12" plus 2 is "2027-02".
export function addMonths(monthKey: string, count: number): string {
  const match = MONTH_KEY.exec(monthKey)
  if (!match) throw new Error(`Not a month: ${monthKey}`)
  const index = Number(match[1]) * 12 + (Number(match[2]) - 1) + count
  return monthKeyOf(Math.floor(index / 12), (index % 12) + 1)
}

export function formatMonthKey(monthKey: string): string {
  const match = MONTH_KEY.exec(monthKey)
  return match ? `${hebrewMonthName(Number(match[2]))} ${match[1]}` : monthKey
}

// Reads a month typed or formatted in the ways people use in a spreadsheet:
// a real date, "2026-12", "12/2026", "12.2026" or "12-2026". Returns null when it is not a month.
export function parseMonthInput(value: unknown): string | null {
  if (value instanceof Date) return monthKeyOf(value.getUTCFullYear(), value.getUTCMonth() + 1)
  if (typeof value !== "string") return null

  const text = value.trim()
  if (isMonthKey(text)) return text
  const yearLast = /^(\d{1,2})[/.\-](\d{4})$/.exec(text)
  if (yearLast) {
    const month = Number(yearLast[1])
    return month >= 1 && month <= 12 ? monthKeyOf(Number(yearLast[2]), month) : null
  }
  return null
}

// Divides an amount into equal parts in agorot; the last part takes the rounding remainder,
// so the parts always add up to the amount.
export function splitEvenly(totalAgorot: number, parts: number): number[] {
  if (parts <= 0) return []
  const base = Math.floor(totalAgorot / parts)
  return Array.from({ length: parts }, (_, index) => (index === parts - 1 ? totalAgorot - base * (parts - 1) : base))
}

export function percentPaid(paid: number, total: number): number {
  return total > 0 ? (paid / total) * 100 : 0
}

export const MAX_INSTALLMENTS = 36
