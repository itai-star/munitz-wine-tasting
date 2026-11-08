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

export type MonthTotals = { month: number; bottles: number; wineRevenueAgorot: number }

export type Compared = { current: number; previous: number; changePercent: number | null }

// A year against the year before it, on the months both have. A year still in progress is therefore set against the same
// months of the year before, and not against its whole.
export type YearComparison = {
  previousYear: number
  months: number[]
  isPartial: boolean
  bottles: Compared
  revenueAgorot: Compared
  revenueNetAgorot: Compared
  avgPriceNetAgorot: Compared
}

function compared(current: number, previous: number): Compared {
  return { current, previous, changePercent: changePercent(current, previous) }
}

export function compareYears(year: number, current: MonthTotals[], previous: MonthTotals[]): YearComparison | null {
  const before = new Map(previous.map((entry) => [entry.month, entry]))
  const common = current.filter((entry) => before.has(entry.month)).sort((a, b) => a.month - b.month)
  if (common.length === 0) return null

  const sum = (rows: MonthTotals[], pick: (row: MonthTotals) => number): number => rows.reduce((total, row) => total + pick(row), 0)
  const other = common.map((entry) => before.get(entry.month) as MonthTotals)
  const bottles = { current: sum(common, (row) => row.bottles), previous: sum(other, (row) => row.bottles) }
  const revenue = { current: sum(common, (row) => row.wineRevenueAgorot), previous: sum(other, (row) => row.wineRevenueAgorot) }
  const net = { current: sum(common, (row) => beforeVat(row.wineRevenueAgorot, year)), previous: sum(other, (row) => beforeVat(row.wineRevenueAgorot, year - 1)) }
  const avgPrice = (netAgorot: number, count: number): number => (count > 0 ? Math.round(netAgorot / count) : 0)

  return {
    previousYear: year - 1,
    months: common.map((entry) => entry.month),
    isPartial: common.length < 12,
    bottles: compared(bottles.current, bottles.previous),
    revenueAgorot: compared(revenue.current, revenue.previous),
    revenueNetAgorot: compared(net.current, net.previous),
    avgPriceNetAgorot: compared(avgPrice(net.current, bottles.current), avgPrice(net.previous, bottles.previous)),
  }
}

// "ינואר עד אוקטובר" for months that follow each other, a count of months otherwise.
export function monthsRangeText(months: number[]): string {
  const sorted = [...months].sort((a, b) => a - b)
  if (sorted.length === 1) return HEBREW_MONTHS[sorted[0] - 1]
  const contiguous = sorted.every((month, index) => index === 0 || month === sorted[index - 1] + 1)
  return contiguous ? `${HEBREW_MONTHS[sorted[0] - 1]} עד ${HEBREW_MONTHS[sorted[sorted.length - 1] - 1]}` : `${sorted.length} חודשים`
}
