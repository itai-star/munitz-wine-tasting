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

export type RoomSummary = {
  active: number
  removed: number
  byType: { type: string; count: number }[]
  byYear: { year: number; count: number }[]
}

// Only the barrels still in stock are counted by type and by year.
export function summarizeRoom(barrels: BarrelRow[]): RoomSummary {
  const inStock = barrels.filter((barrel) => !barrel.removed)
  const types = new Map<string, number>()
  const years = new Map<number, number>()
  for (const barrel of inStock) {
    types.set(barrel.type, (types.get(barrel.type) ?? 0) + 1)
    years.set(barrel.year, (years.get(barrel.year) ?? 0) + 1)
  }
  return {
    active: inStock.length,
    removed: barrels.length - inStock.length,
    byType: Array.from(types, ([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count || a.type.localeCompare(b.type, "he")),
    byYear: Array.from(years, ([year, count]) => ({ year, count })).sort((a, b) => b.year - a.year),
  }
}
