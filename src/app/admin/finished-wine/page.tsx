import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { CreateVintageForm } from "@/components/vineyard/create-vintage-form"
import { VintageSelect } from "@/components/vineyard/vintage-select"
import { FinishedWineAverageChart } from "@/components/finished-wine/finished-wine-charts"
import { calculateWineEfficiency } from "@/lib/wine-efficiency"

export const dynamic = "force-dynamic"

export default async function FinishedWinePage({
  searchParams,
}: {
  searchParams: Promise<{ vintage?: string }>
}) {
  const { vintage: vintageParam } = await searchParams
  const vintages = await prisma.vintage.findMany({ orderBy: { year: "desc" } })

  if (vintages.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-stone-800 mb-6">יין מוכן</h1>
        <p className="text-stone-500 mb-4">
          יש ליצור עונה/בציר ראשון לפני רישום יין מוכן.
        </p>
        <CreateVintageForm />
      </div>
    )
  }

  const selectedVintage =
    vintages.find((v) => v.year === Number(vintageParam)) ?? vintages[0]

  const wines = await prisma.finishedWine.findMany({
    where: { vintageId: selectedVintage.id },
    include: { block: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-stone-800">יין מוכן — {selectedVintage.label}</h1>
        <div className="flex gap-4 items-center flex-wrap">
          <VintageSelect
            vintages={vintages.map((v) => ({ year: v.year, label: v.label }))}
            selectedYear={selectedVintage.year}
          />
          <Link
            href="/admin/finished-wine/new"
            className="bg-wine text-white px-4 py-2 rounded-lg hover:bg-wine-dark transition-colors text-sm font-medium"
          >
            + רשומה חדשה
          </Link>
        </div>
      </div>

      <FinishedWineAverageChart records={wines} />

      {wines.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-stone-200">
          <p className="text-stone-500 text-lg">אין עדיין רשומות יין מוכן לעונה זו</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {wines.map((wine) => {
            const efficiency = calculateWineEfficiency(wine)
            const stages = [
              { label: "פראס", value: efficiency.afterPressing },
              { label: "שפייה 1", value: efficiency.afterFirstRacking },
              { label: "שפייה 2", value: efficiency.afterSecondRacking },
            ].filter((s) => s.value != null)

            return (
              <Link
                key={wine.id}
                href={`/admin/finished-wine/${wine.id}`}
                className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 hover:border-wine/40 transition-colors"
              >
                <p className="font-medium text-stone-800">{wine.tank}</p>
                <p className="text-sm text-stone-500 mt-1">
                  {wine.block && `כרם ${wine.block.name} `}
                  נבצרו {wine.harvestedWeightKg} ק&quot;ג
                </p>
                {stages.length > 0 && (
                  <p className="text-xs text-stone-400 mt-2">
                    {stages.map((s) => `${s.label} ${s.value!.toFixed(1)}%`).join(" · ")}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
