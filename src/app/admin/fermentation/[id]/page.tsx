import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { FermentationLog } from "@/components/fermentation/fermentation-log"
import { FermentationCharts } from "@/components/fermentation/fermentation-charts"
import { BatchControls } from "@/components/fermentation/batch-controls"

export const dynamic = "force-dynamic"

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const batch = await prisma.fermentationBatch.findUnique({
    where: { id },
    include: { blocks: { include: { block: true } } },
  })
  if (!batch) notFound()

  const [readings, blocks, readingCount] = await Promise.all([
    prisma.fermentationReading.findMany({
      where: { batchId: id },
      orderBy: { readingDate: "asc" },
    }),
    prisma.vineyardBlock.findMany({ orderBy: { name: "asc" } }),
    prisma.fermentationReading.count({ where: { batchId: id } }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{batch.tankName}</h1>
          <p className="text-sm text-stone-500 mt-1">
            {batch.wineType && `${batch.wineType} · `}
            {batch.blocks.map((b) => b.block.name).join(", ")}
            {batch.volumeLiters != null && ` · ${batch.volumeLiters} ליטר`}
            {batch.litersAfterPressing != null && ` · ${batch.litersAfterPressing} ליטר אחרי פראס`}
            {batch.litersAfterSettling != null && ` · ${batch.litersAfterSettling} ליטר אחרי שפיה`}
            {batch.yeastStrain && ` · ${batch.yeastStrain}`}
          </p>
        </div>
        <BatchControls
          batch={{
            id: batch.id,
            tankName: batch.tankName,
            wineType: batch.wineType,
            volumeLiters: batch.volumeLiters,
            litersAfterPressing: batch.litersAfterPressing,
            litersAfterSettling: batch.litersAfterSettling,
            yeastStrain: batch.yeastStrain,
            startDate: batch.startDate,
            notes: batch.notes,
            blocks: batch.blocks.map((b) => ({ blockId: b.blockId })),
            status: batch.status,
          }}
          vintageId={batch.vintageId}
          blocks={blocks}
          readingCount={readingCount}
        />
      </div>

      <FermentationLog batchId={batch.id} readings={readings} />

      <FermentationCharts
        readings={readings.map((r) => ({
          readingDate: r.readingDate,
          brix: r.brix,
          specificGravity: r.specificGravity,
          temperatureCelsius: r.temperatureCelsius,
          ph: r.ph,
          tankName: batch.tankName,
        }))}
      />
    </div>
  )
}
