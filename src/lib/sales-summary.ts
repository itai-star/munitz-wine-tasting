export const HEBREW_MONTHS = [
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
] as const

// Israel's VAT went from 17% to 18% on 1 January 2025; the sales workbook divides by 1.18.
export function vatRateForYear(year: number): number {
  return year >= 2025 ? 0.18 : 0.17
}

export function beforeVat(amountAgorot: number, year: number): number {
  return Math.round(amountAgorot / (1 + vatRateForYear(year)))
}

export function percentOf(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0
}

// Percentage change from one value to the next, or null when there is nothing to compare with.
export function changePercent(current: number, previous: number): number | null {
  return previous > 0 ? ((current - previous) / previous) * 100 : null
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatSignedPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`
}

export function formatCount(value: number): string {
  return value.toLocaleString("he-IL")
}

export type MonthSheetName = (typeof HEBREW_MONTHS)[number]

// Month number (1-12) for a worksheet named after a Hebrew month, otherwise null.
export function monthOfSheetName(name: string): number | null {
  const index = HEBREW_MONTHS.indexOf(name.trim() as MonthSheetName)
  return index === -1 ? null : index + 1
}

export type CustomerTypeKey = "PRIVATE" | "WHOLESALE"

export const CUSTOMER_TYPE_LABELS: Record<CustomerTypeKey, string> = {
  PRIVATE: "פרטי",
  WHOLESALE: "סיטונאי",
}

export const UNCLASSIFIED_LABEL = "לא מסווג"

export function isCustomerType(value: string): value is CustomerTypeKey {
  return value === "PRIVATE" || value === "WHOLESALE"
}

// The sheet names a wine together with its vintage, for example "ערבה 24". Grouping by the name
// alone combines the vintages of the same wine.
export function wineKey(wine: string, byVintage: boolean): string {
  if (byVintage) return wine
  return wine.replace(/\s+\d{2}$/, "").trim() || wine
}

// Divides a sale's revenue between its wines by bottle count; the last wine takes the rounding remainder,
// so the parts always add up to the sale.
export function allocateRevenue(
  revenueAgorot: number,
  items: { wine: string; bottles: number }[]
): { wine: string; bottles: number; revenueAgorot: number }[] {
  const totalBottles = items.reduce((sum, item) => sum + item.bottles, 0)
  if (items.length === 0 || totalBottles === 0) {
    return revenueAgorot === 0 ? [] : [{ wine: "ללא פירוט יין", bottles: 0, revenueAgorot }]
  }

  let allocated = 0
  return items.map((item, index) => {
    const isLast = index === items.length - 1
    const share = isLast ? revenueAgorot - allocated : Math.round((revenueAgorot * item.bottles) / totalBottles)
    allocated += share
    return { wine: item.wine, bottles: item.bottles, revenueAgorot: share }
  })
}
