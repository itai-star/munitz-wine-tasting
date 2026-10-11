import { prisma } from "@/lib/prisma"
import { WineManager } from "@/components/admin/wine-manager"
import { WineStockByVintageChart } from "@/components/admin/wine-stock-by-vintage-chart"

export const dynamic = "force-dynamic"

export default async function WinesPage() {
  const wines = await prisma.wine.findMany({
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">ניהול יינות</h1>
      <WineStockByVintageChart
        wines={wines.map((w) => ({ id: w.id, name: w.name, year: w.year, quantity: w.quantity }))}
      />
      <WineManager wines={wines} />
    </div>
  )
}
