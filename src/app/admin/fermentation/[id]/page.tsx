import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { FermentationLog } from "@/components/fermentation/fermentation-log"
import { FermentationCharts } from "@/components/fermentation/fermentation-charts"
import { BatchStatusControl } from "@/components/fermentation/batch-status-control"

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

  const readings = await prisma.fermentationReading.findMany({
    where: { batchId: id },
    orderBy: { readingDate: "asc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{batch.tankName}</h1>
          <p className="text-sm text-stone-500 mt-1">
            {batch.blocks.map((b) => b.block.name).join(", ")}
            {batch.volumeLiters != null && ` · ${batch.volumeLiters} ליטר`}
            {batch.yeastStrain && ` · ${batch.yeastStrain}`}
          </p>
        </div>
        <BatchStatusControl batchId={batch.id} status={batch.status} />
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
