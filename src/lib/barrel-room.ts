import type { WinePart } from "@/lib/barrel-wine"

export type BarrelRow = {
  id: string
  number: string
  type: string
  year: number
  removed: boolean
  // The day the barrel left the stock, "YYYY-MM-DD".
  removedOn: string | null
  removalNote: string | null
}

export const MIN_BARREL_YEAR = 1950
export const MAX_BARREL_YEAR = 2100
export const MAX_BARREL_NUMBER_LENGTH = 20
export const MAX_BARREL_TYPE_LENGTH = 60

export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

export function isValidBarrelYear(year: number): boolean {
  return Number.isInteger(year) && year >= MIN_BARREL_YEAR && year <= MAX_BARREL_YEAR
}

// Numbers such as 2, 10 and 11 sort as numbers, and a number with letters, such as A7, falls into its place.
// The same number can belong to a barrel in stock and to older ones that left it; the one in stock comes first.
export function compareBarrels(a: Pick<BarrelRow, "number" | "removed">, b: Pick<BarrelRow, "number" | "removed">): number {
  return a.number.localeCompare(b.number, "he", { numeric: true }) || Number(a.removed) - Number(b.removed)
}

// A barrel is used for many years. In a given year it is "in stock" if it never left, "removed this year" if it left
// during that year, and "removed later" if it was still in use then and left afterwards. It does not exist in a year
// before its own year, nor in a year after it left.
export type YearState = "IN_STOCK" | "REMOVED_THIS_YEAR" | "REMOVED_LATER"

export function stateInYear(barrel: Pick<BarrelRow, "year" | "removedOn">, year: number): YearState | null {
  if (barrel.year > year) return null
  if (!barrel.removedOn) return "IN_STOCK"
  const removedYear = Number(barrel.removedOn.slice(0, 4))
  if (removedYear < year) return null
  return removedYear === year ? "REMOVED_THIS_YEAR" : "REMOVED_LATER"
}

export type BarrelTestRow = {
  id: string
  testDate: string
  lab: string | null
  density: number | null
  ethanol: number | null
  ph: number | null
  totalAcid: number | null
  volatile: number | null
  rsBx: number | null
  co2: number | null
  malicAcid: number | null
  freeBisulfite: number | null
  notes: string | null
  actionItems: string | null
}

// What a barrel is in a given year: its wine, from one or more vineyard blocks, and its lab tests.
export type BarrelYearRow = BarrelRow & {
  state: YearState
  parts: WinePart[]
  tests: BarrelTestRow[]
  // The marks of the barrel for the year; see the procurement rules.
  includeInBottling: boolean
  lastRound: boolean
}

export type BlockOption = { id: string; name: string; variety: string }

// The finished wine of a block in a year, against what barrels of that year already took from it. A filled barrel takes
// the wine it holds and the wine kept aside to top it up, as the barrel plan counts it.
export type BlockSupply = BlockOption & { forecastLiters: number; usedLiters: number }

export type YearSummary = {
  total: number
  withWine: number
  withoutWine: number
  left: number
  tests: number
  // Barrels per variety; a barrel of a blend counts for each variety by its share, so the figures can be fractions.
  byVariety: { variety: string; count: number }[]
  byType: { type: string; count: number }[]
}

export function summarizeYear(rows: BarrelYearRow[]): YearSummary {
  const varieties = new Map<string, number>()
  const types = new Map<string, number>()
  for (const row of rows) {
    types.set(row.type, (types.get(row.type) ?? 0) + 1)
    for (const part of row.parts) varieties.set(part.variety, (varieties.get(part.variety) ?? 0) + part.percent / 100)
  }
  const byCount = <T extends { count: number }>(a: T, b: T): number => b.count - a.count
  const withWine = rows.filter((row) => row.parts.length > 0).length
  return {
    total: rows.length,
    withWine,
    withoutWine: rows.length - withWine,
    left: rows.filter((row) => row.state !== "IN_STOCK").length,
    tests: rows.reduce((sum, row) => sum + row.tests.length, 0),
    byVariety: Array.from(varieties, ([variety, count]) => ({ variety, count: Math.round(count * 10) / 10 })).sort((a, b) => byCount(a, b) || a.variety.localeCompare(b.variety, "he")),
    byType: Array.from(types, ([type, count]) => ({ type, count })).sort((a, b) => byCount(a, b) || a.type.localeCompare(b.type, "he")),
  }
}
