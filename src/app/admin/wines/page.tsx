import { prisma } from "@/lib/prisma"
import { WineManager } from "@/components/admin/wine-manager"
import { WineStockByVintageChart } from "@/components/admin/wine-stock-by-vintage-chart"

export const dynamic = "force-dynamic"

export default async function WinesPage() {
  const wines = await prisma.wine.findMany({
    orderBy: { createdAt: "desc" },
  })

  const bottlesByVintage = new Map<string, { sortKey: number; bottles: number }>()
  for (const wine of wines) {
    const label = wine.year == null ? "ללא שנה" : String(wine.year)
    const entry = bottlesByVintage.get(label) ?? { sortKey: wine.year ?? Infinity, bottles: 0 }
    entry.bottles += wine.quantity
    bottlesByVintage.set(label, entry)
  }
  const stockRows = Array.from(bottlesByVintage, ([vintage, { sortKey, bottles }]) => ({
    vintage,
    sortKey,
    bottles,
  }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ vintage, bottles }) => ({ vintage, bottles }))

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">ניהול יינות</h1>
      <WineStockByVintageChart rows={stockRows} />
      <WineManager wines={wines} />
    </div>
  )
}
