import { formatWineName } from "@/lib/wine-label"

export type StockWine = { id: string; name: string; year: number | null; type: string | null; quantity: number }

export type StockTypeKey = "RED" | "WHITE" | "ROSE" | "OTHER"

export const STOCK_TYPE_KEYS: StockTypeKey[] = ["RED", "WHITE", "ROSE", "OTHER"]

export const STOCK_TYPE_LABELS: Record<StockTypeKey, string> = {
  RED: "אדום",
  WHITE: "לבן",
  ROSE: "רוזה",
  OTHER: "ללא סוג",
}

export const STOCK_TYPE_COLORS: Record<StockTypeKey, string> = {
  RED: "#722F37",
  WHITE: "#a16207",
  ROSE: "#db2777",
  OTHER: "#a8a29e",
}

export type StockTypeTotal = { key: StockTypeKey; bottles: number; wines: number; share: number }

export type StockRow = { id: string; label: string; type: StockTypeKey; quantity: number; share: number }

export type StockOverview = {
  totalBottles: number
  winesInStock: number
  byType: StockTypeTotal[]
  rows: StockRow[]
  soldOut: StockRow[]
}

// The type is free text in the wine form, so anything that is not clearly red, white or rosé is grouped apart.
export function stockTypeOf(type: string | null): StockTypeKey {
  const text = (type ?? "").trim()
  if (text.startsWith("אדום")) return "RED"
  if (text.startsWith("לבן")) return "WHITE"
  if (text.startsWith("רוזה") || text.startsWith("רוזט")) return "ROSE"
  return "OTHER"
}

export function summarizeStock(wines: StockWine[]): StockOverview {
  const toRow = (wine: StockWine, total: number): StockRow => ({
    id: wine.id,
    label: formatWineName(wine.name, wine.year),
    type: stockTypeOf(wine.type),
    quantity: wine.quantity,
    share: total > 0 ? (wine.quantity / total) * 100 : 0,
  })

  const inStock = wines.filter((wine) => wine.quantity > 0)
  const totalBottles = inStock.reduce((sum, wine) => sum + wine.quantity, 0)
  const rows = inStock.map((wine) => toRow(wine, totalBottles)).sort((a, b) => b.quantity - a.quantity)
  const soldOut = wines
    .filter((wine) => wine.quantity <= 0)
    .map((wine) => toRow(wine, totalBottles))
    .sort((a, b) => a.label.localeCompare(b.label, "he"))

  const byType = STOCK_TYPE_KEYS.map((key): StockTypeTotal => {
    const group = rows.filter((row) => row.type === key)
    const bottles = group.reduce((sum, row) => sum + row.quantity, 0)
    return { key, bottles, wines: group.length, share: totalBottles > 0 ? (bottles / totalBottles) * 100 : 0 }
  }).filter((entry) => entry.bottles > 0)

  return { totalBottles, winesInStock: rows.length, byType, rows, soldOut }
}
