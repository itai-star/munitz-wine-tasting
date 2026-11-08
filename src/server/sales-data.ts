import { prisma } from "@/lib/prisma"
import { formatShekels, hebrewMonthName } from "@/lib/credit"
import {
  CUSTOMER_TYPE_LABELS,
  UNCLASSIFIED_LABEL,
  beforeVat,
  changePercent,
  compareYears,
  formatPercent,
  isCustomerType,
  monthsRangeText,
  percentOf,
  wineKey,
} from "@/lib/sales-summary"
import type { CustomerTypeKey, MonthTotals, YearComparison } from "@/lib/sales-summary"

export type TypeKey = CustomerTypeKey | "UNCLASSIFIED"
export const TYPE_KEYS: TypeKey[] = ["PRIVATE", "WHOLESALE", "UNCLASSIFIED"]
export const TYPE_LABELS: Record<TypeKey, string> = { ...CUSTOMER_TYPE_LABELS, UNCLASSIFIED: UNCLASSIFIED_LABEL }

export type Amount = { bottles: number; revenueAgorot: number }
export type TypeSplit = Record<TypeKey, Amount>

export type TypeRow = Amount & { key: TypeKey; label: string; sharePercent: number }
export type WineRow = Amount & { label: string; sharePercent: number; byType: TypeSplit }
export type CustomerRow = Amount & { name: string; sharePercent: number }
export type UnclassifiedCustomer = Amount & { name: string }

export type MonthSummary = {
  year: number
  month: number
  label: string
  bottles: number
  sales: number
  revenueAgorot: number
  revenueNetAgorot: number
  avgPriceNetAgorot: number
  avgSaleAgorot: number
  types: TypeRow[]
  wines: WineRow[]
  topCustomers: CustomerRow[]
  previousLabel: string | null
  revenueChangePercent: number | null
  bottlesChangePercent: number | null
  // The same month of the year before, when it was imported.
  lastYearLabel: string | null
  revenueChangeYearPercent: number | null
  bottlesChangeYearPercent: number | null
  insights: string[]
}

export type YearMonthRow = {
  month: number
  label: string
  hasData: boolean
  bottles: number
  revenueAgorot: number
  revenueNetAgorot: number
  avgPriceNetAgorot: number
  cumulativeNetAgorot: number
  byType: TypeSplit
  // The same month of the year before.
  lastYear: { bottles: number; revenueAgorot: number; revenueNetAgorot: number } | null
  changeYearPercent: number | null
}

export type YearSummary = {
  year: number
  months: YearMonthRow[]
  monthsWithData: number
  bottles: number
  revenueAgorot: number
  revenueNetAgorot: number
  avgPriceNetAgorot: number
  avgMonthlyNetAgorot: number
  types: TypeRow[]
  wines: WineRow[]
  topCustomers: CustomerRow[]
  comparison: YearComparison | null
  insights: string[]
}

export type SalesOverview = {
  years: number[]
  year: number
  byVintage: boolean
  monthsWithData: number[]
  selectedMonth: number | null
  yearSummary: YearSummary
  monthSummary: MonthSummary | null
  unclassified: UnclassifiedCustomer[]
}

// The yearly chart lists this many customers; the monthly one lists five plus the rest.
const YEAR_TOP_CUSTOMERS = 10

function loadYearRows(year: number) {
  return prisma.salesMonth.findMany({
    where: { year },
    orderBy: { month: "asc" },
    include: { sales: { include: { items: true } } },
  })
}

type LoadedMonth = Awaited<ReturnType<typeof loadYearRows>>[number]
type LoadedSale = LoadedMonth["sales"][number]

function typeKeyOf(sale: LoadedSale): TypeKey {
  return sale.customerType && isCustomerType(sale.customerType) ? sale.customerType : "UNCLASSIFIED"
}

function emptySplit(): TypeSplit {
  return {
    PRIVATE: { bottles: 0, revenueAgorot: 0 },
    WHOLESALE: { bottles: 0, revenueAgorot: 0 },
    UNCLASSIFIED: { bottles: 0, revenueAgorot: 0 },
  }
}

function allSales(months: LoadedMonth[]): LoadedSale[] {
  return months.flatMap((month) => month.sales)
}

function typeRows(sales: LoadedSale[], totalRevenue: number): TypeRow[] {
  const split = emptySplit()
  for (const sale of sales) {
    const entry = split[typeKeyOf(sale)]
    entry.bottles += sale.bottles
    entry.revenueAgorot += sale.revenueAgorot
  }
  return TYPE_KEYS.filter((key) => split[key].bottles > 0 || split[key].revenueAgorot > 0).map((key) => ({
    key,
    label: TYPE_LABELS[key],
    ...split[key],
    sharePercent: percentOf(split[key].revenueAgorot, totalRevenue),
  }))
}

function wineRows(sales: LoadedSale[], totalRevenue: number, byVintage: boolean): WineRow[] {
  const byWine = new Map<string, { total: Amount; byType: TypeSplit }>()
  for (const sale of sales) {
    const type = typeKeyOf(sale)
    for (const item of sale.items) {
      const key = wineKey(item.wine, byVintage)
      const entry = byWine.get(key) ?? { total: { bottles: 0, revenueAgorot: 0 }, byType: emptySplit() }
      entry.total.bottles += item.bottles
      entry.total.revenueAgorot += item.revenueAgorot
      entry.byType[type].bottles += item.bottles
      entry.byType[type].revenueAgorot += item.revenueAgorot
      byWine.set(key, entry)
    }
  }
  return [...byWine]
    .map(([label, entry]) => ({
      label,
      ...entry.total,
      sharePercent: percentOf(entry.total.revenueAgorot, totalRevenue),
      byType: entry.byType,
    }))
    .sort((a, b) => b.revenueAgorot - a.revenueAgorot || b.bottles - a.bottles)
}

function customerRows(sales: LoadedSale[], totalRevenue: number, limit: number): CustomerRow[] {
  const byName = new Map<string, Amount>()
  for (const sale of sales) {
    const entry = byName.get(sale.name) ?? { bottles: 0, revenueAgorot: 0 }
    entry.bottles += sale.bottles
    entry.revenueAgorot += sale.revenueAgorot
    byName.set(sale.name, entry)
  }
  return [...byName]
    .map(([name, amount]) => ({ name, ...amount, sharePercent: percentOf(amount.revenueAgorot, totalRevenue) }))
    .sort((a, b) => b.revenueAgorot - a.revenueAgorot)
    .slice(0, limit)
}

function monthInsights(summary: Omit<MonthSummary, "insights">): string[] {
  const insights: string[] = []

  if (summary.revenueChangePercent !== null && summary.previousLabel) {
    const direction = summary.revenueChangePercent >= 0 ? "עלו" : "ירדו"
    insights.push(
      `הכנסות היין לפני מע"מ ${direction} ב-${formatPercent(Math.abs(summary.revenueChangePercent))} לעומת ${summary.previousLabel}`
    )
  }
  if (summary.revenueChangeYearPercent !== null && summary.lastYearLabel) {
    const direction = summary.revenueChangeYearPercent >= 0 ? "עלו" : "ירדו"
    insights.push(
      `הכנסות היין לפני מע"מ ${direction} ב-${formatPercent(Math.abs(summary.revenueChangeYearPercent))} לעומת ${summary.lastYearLabel}`
    )
  }
  const wholesale = summary.types.find((row) => row.key === "WHOLESALE")
  const privateSales = summary.types.find((row) => row.key === "PRIVATE")
  if (wholesale && privateSales) {
    insights.push(
      `סיטונאים הביאו ${formatPercent(wholesale.sharePercent)} מההכנסות ופרטיים ${formatPercent(privateSales.sharePercent)}`
    )
  }
  const topWine = summary.wines[0]
  if (topWine) insights.push(`היין עם ההכנסה הגבוהה ביותר: ${topWine.label}, ${formatPercent(topWine.sharePercent)} מההכנסות`)
  const topCustomer = summary.topCustomers[0]
  if (topCustomer && topCustomer.sharePercent >= 30) {
    insights.push(`${topCustomer.name} אחראי ל-${formatPercent(topCustomer.sharePercent)} מההכנסות החודש`)
  }
  return insights
}

function buildMonthSummary(
  month: LoadedMonth,
  byVintage: boolean,
  previous: { year: number; month: number; bottles: number; wineRevenueAgorot: number } | null,
  lastYear: { year: number; month: number; bottles: number; wineRevenueAgorot: number } | null
): MonthSummary {
  const net = beforeVat(month.wineRevenueAgorot, month.year)
  const sales = month.sales.filter((sale) => sale.bottles > 0).length
  const previousNet = previous ? beforeVat(previous.wineRevenueAgorot, previous.year) : 0
  const lastYearNet = lastYear ? beforeVat(lastYear.wineRevenueAgorot, lastYear.year) : 0

  const base = {
    year: month.year,
    month: month.month,
    label: hebrewMonthName(month.month),
    bottles: month.bottles,
    sales,
    revenueAgorot: month.wineRevenueAgorot,
    revenueNetAgorot: net,
    avgPriceNetAgorot: month.bottles > 0 ? Math.round(net / month.bottles) : 0,
    avgSaleAgorot: sales > 0 ? Math.round(month.wineRevenueAgorot / sales) : 0,
    types: typeRows(month.sales, month.wineRevenueAgorot),
    wines: wineRows(month.sales, month.wineRevenueAgorot, byVintage),
    topCustomers: customerRows(month.sales, month.wineRevenueAgorot, 5),
    previousLabel: previous ? hebrewMonthName(previous.month) : null,
    revenueChangePercent: previous ? changePercent(net, previousNet) : null,
    bottlesChangePercent: previous ? changePercent(month.bottles, previous.bottles) : null,
    lastYearLabel: lastYear ? `${hebrewMonthName(lastYear.month)} ${lastYear.year}` : null,
    revenueChangeYearPercent: lastYear ? changePercent(net, lastYearNet) : null,
    bottlesChangeYearPercent: lastYear ? changePercent(month.bottles, lastYear.bottles) : null,
  }
  return { ...base, insights: monthInsights(base) }
}

function yearInsights(
  rows: YearMonthRow[],
  summary: Pick<YearSummary, "wines" | "types" | "topCustomers" | "avgMonthlyNetAgorot" | "comparison">,
): string[] {
  const withData = rows.filter((row) => row.hasData)
  if (withData.length === 0) return []
  const insights: string[] = []

  const comparison = summary.comparison
  if (comparison && comparison.revenueNetAgorot.changePercent !== null) {
    const change = comparison.revenueNetAgorot.changePercent
    const basis = comparison.isPartial ? `אותם חודשים ב-${comparison.previousYear} (${monthsRangeText(comparison.months)})` : `${comparison.previousYear}`
    insights.push(`ההכנסות לפני מע"מ ${change >= 0 ? "עלו" : "ירדו"} ב-${formatPercent(Math.abs(change))} לעומת ${basis}`)
  }

  const best = withData.reduce((a, b) => (b.revenueNetAgorot > a.revenueNetAgorot ? b : a))
  const worst = withData.reduce((a, b) => (b.revenueNetAgorot < a.revenueNetAgorot ? b : a))
  insights.push(`החודש החזק ביותר: ${best.label}, עם ${formatShekels(best.revenueNetAgorot)} לפני מע"מ`)
  if (withData.length > 1) insights.push(`החודש החלש ביותר: ${worst.label}, עם ${formatShekels(worst.revenueNetAgorot)} לפני מע"מ`)

  if (withData.length >= 6) {
    const last = withData.slice(-3).reduce((sum, row) => sum + row.revenueNetAgorot, 0)
    const before = withData.slice(-6, -3).reduce((sum, row) => sum + row.revenueNetAgorot, 0)
    const change = changePercent(last, before)
    if (change !== null) {
      insights.push(
        `בשלושת החודשים האחרונים ההכנסות ${change >= 0 ? "עלו" : "ירדו"} ב-${formatPercent(Math.abs(change))} לעומת שלושת החודשים שלפניהם`
      )
    }
  }
  const avg = summary.avgMonthlyNetAgorot
  const spike = withData.find((row) => avg > 0 && row.revenueNetAgorot > avg * 2)
  if (spike) insights.push(`${spike.label} חריג כלפי מעלה: פי ${(spike.revenueNetAgorot / avg).toFixed(1)} מהממוצע החודשי`)

  const wholesale = summary.types.find((row) => row.key === "WHOLESALE")
  const privateSales = summary.types.find((row) => row.key === "PRIVATE")
  if (wholesale && privateSales) {
    insights.push(`בשנה סיטונאים הביאו ${formatPercent(wholesale.sharePercent)} מההכנסות ופרטיים ${formatPercent(privateSales.sharePercent)}`)
  }
  if (summary.wines[0]) {
    insights.push(`היין עם ההכנסה הגבוהה ביותר בשנה: ${summary.wines[0].label}, ${formatPercent(summary.wines[0].sharePercent)} מההכנסות`)
  }
  const top = summary.topCustomers[0]
  if (top && top.sharePercent >= 15) insights.push(`${top.name} הוא הלקוח הגדול, עם ${formatPercent(top.sharePercent)} מההכנסות`)
  return insights
}

function buildYearSummary(year: number, months: LoadedMonth[], byVintage: boolean, previousMonths: MonthTotals[]): YearSummary {
  const byMonth = new Map(months.map((month) => [month.month, month]))
  const lastYearOf = new Map(previousMonths.map((month) => [month.month, month]))
  let cumulative = 0

  const rows: YearMonthRow[] = Array.from({ length: 12 }, (_, index) => {
    const number = index + 1
    const data = byMonth.get(number)
    const net = data ? beforeVat(data.wineRevenueAgorot, year) : 0
    cumulative += net
    const byType = emptySplit()
    const lastYearMonth = lastYearOf.get(number)
    const lastYearNet = lastYearMonth ? beforeVat(lastYearMonth.wineRevenueAgorot, year - 1) : 0
    for (const sale of data?.sales ?? []) {
      byType[typeKeyOf(sale)].bottles += sale.bottles
      byType[typeKeyOf(sale)].revenueAgorot += sale.revenueAgorot
    }
    return {
      month: number,
      label: hebrewMonthName(number),
      hasData: data !== undefined,
      bottles: data?.bottles ?? 0,
      revenueAgorot: data?.wineRevenueAgorot ?? 0,
      revenueNetAgorot: net,
      avgPriceNetAgorot: data && data.bottles > 0 ? Math.round(net / data.bottles) : 0,
      cumulativeNetAgorot: cumulative,
      byType,
      lastYear: lastYearMonth ? { bottles: lastYearMonth.bottles, revenueAgorot: lastYearMonth.wineRevenueAgorot, revenueNetAgorot: lastYearNet } : null,
      changeYearPercent: data && lastYearMonth ? changePercent(net, lastYearNet) : null,
    }
  })

  const sales = allSales(months)
  const bottles = rows.reduce((sum, row) => sum + row.bottles, 0)
  const revenue = rows.reduce((sum, row) => sum + row.revenueAgorot, 0)
  const net = rows.reduce((sum, row) => sum + row.revenueNetAgorot, 0)
  const monthsWithData = rows.filter((row) => row.hasData).length
  const avgMonthlyNetAgorot = monthsWithData > 0 ? Math.round(net / monthsWithData) : 0

  const types = typeRows(sales, revenue)
  const wines = wineRows(sales, revenue, byVintage)
  const topCustomers = customerRows(sales, revenue, YEAR_TOP_CUSTOMERS)
  const comparison = compareYears(year, months, previousMonths)

  return {
    year,
    months: rows,
    monthsWithData,
    bottles,
    revenueAgorot: revenue,
    revenueNetAgorot: net,
    avgPriceNetAgorot: bottles > 0 ? Math.round(net / bottles) : 0,
    avgMonthlyNetAgorot,
    types,
    wines,
    topCustomers,
    comparison,
    insights: yearInsights(rows, { wines, types, topCustomers, avgMonthlyNetAgorot, comparison }),
  }
}

function unclassifiedCustomers(months: LoadedMonth[]): UnclassifiedCustomer[] {
  const byName = new Map<string, Amount>()
  for (const sale of allSales(months)) {
    if (typeKeyOf(sale) !== "UNCLASSIFIED") continue
    const entry = byName.get(sale.name) ?? { bottles: 0, revenueAgorot: 0 }
    entry.bottles += sale.bottles
    entry.revenueAgorot += sale.revenueAgorot
    byName.set(sale.name, entry)
  }
  return [...byName]
    .map(([name, amount]) => ({ name, ...amount }))
    .sort((a, b) => b.revenueAgorot - a.revenueAgorot)
}

function pickYear(value: string | undefined, years: number[]): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && years.includes(parsed) ? parsed : years[0]
}

export async function loadSalesOverview(params: {
  year?: string
  month?: string
  vintages?: string
}): Promise<SalesOverview> {
  const stored = await prisma.salesMonth.findMany({ distinct: ["year"], select: { year: true }, orderBy: { year: "desc" } })
  const years = stored.length > 0 ? stored.map((row) => row.year) : [new Date().getFullYear()]
  const year = pickYear(params.year, years)
  const byVintage = params.vintages === "1"

  const [months, previousMonths] = await Promise.all([
    loadYearRows(year),
    prisma.salesMonth.findMany({ where: { year: year - 1 }, select: { year: true, month: true, bottles: true, wineRevenueAgorot: true } }),
  ])
  const monthsWithData = months.map((month) => month.month)
  const requestedMonth = Number(params.month)
  const selectedMonth = monthsWithData.includes(requestedMonth)
    ? requestedMonth
    : (monthsWithData[monthsWithData.length - 1] ?? null)

  let monthSummary: MonthSummary | null = null
  const selected = months.find((month) => month.month === selectedMonth)
  if (selected) {
    const previous = await prisma.salesMonth.findUnique({
      where: { year_month: { year: selected.month === 1 ? year - 1 : year, month: selected.month === 1 ? 12 : selected.month - 1 } },
      select: { year: true, month: true, bottles: true, wineRevenueAgorot: true },
    })
    monthSummary = buildMonthSummary(selected, byVintage, previous, previousMonths.find((month) => month.month === selected.month) ?? null)
  }

  return {
    years,
    year,
    byVintage,
    monthsWithData,
    selectedMonth,
    yearSummary: buildYearSummary(year, months, byVintage, previousMonths),
    monthSummary,
    unclassified: unclassifiedCustomers(months),
  }
}
