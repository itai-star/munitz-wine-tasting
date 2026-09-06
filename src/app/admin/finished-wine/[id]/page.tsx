import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { FinishedWineControls } from "@/components/finished-wine/finished-wine-controls"
import { FinishedWineStageChart } from "@/components/finished-wine/finished-wine-charts"

export const dynamic = "force-dynamic"

export default async function FinishedWineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const wine = await prisma.finishedWine.findUnique({
    where: { id },
    include: { vintage: true },
  })
  if (!wine) notFound()

  const vintages = await prisma.vintage.findMany({ orderBy: { year: "desc" } })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{wine.tank}</h1>
          <p className="text-sm text-stone-500 mt-1">
            {wine.vintage.label} · {wine.harvestedWeightKg} ק&quot;ג נבצרו
            {wine.litersAfterPressing != null && ` · ${wine.litersAfterPressing} ליטר אחרי פראס`}
            {wine.litersAfterFirstRacking != null &&
              ` · ${wine.litersAfterFirstRacking} ליטר אחרי שפייה ראשונה`}
            {wine.litersAfterSecondRacking != null &&
              ` · ${wine.litersAfterSecondRacking} ליטר אחרי שפייה שנייה`}
          </p>
        </div>
        <FinishedWineControls
          wine={{
            id: wine.id,
            vintageId: wine.vintageId,
            tank: wine.tank,
            harvestedWeightKg: wine.harvestedWeightKg,
            litersAfterPressing: wine.litersAfterPressing,
            litersAfterFirstRacking: wine.litersAfterFirstRacking,
            litersAfterSecondRacking: wine.litersAfterSecondRacking,
          }}
          vintages={vintages.map((v) => ({ id: v.id, label: v.label }))}
        />
      </div>

      <FinishedWineStageChart
        record={{
          harvestedWeightKg: wine.harvestedWeightKg,
          litersAfterPressing: wine.litersAfterPressing,
          litersAfterFirstRacking: wine.litersAfterFirstRacking,
          litersAfterSecondRacking: wine.litersAfterSecondRacking,
        }}
      />
    </div>
  )
}
