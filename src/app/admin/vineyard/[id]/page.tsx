import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { BlockForm } from "@/components/vineyard/block-form"
import { RipenessCharts } from "@/components/vineyard/ripeness-charts"
import { VineyardSensorGrid } from "@/components/vineyard-monitor/vineyard-sensor-grid"
import { getLatestSensorTilesForBlock } from "@/server/actions/vineyard-monitor-actions"

export const dynamic = "force-dynamic"

export default async function BlockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const block = await prisma.vineyardBlock.findUnique({ where: { id } })
  if (!block) notFound()

  const samples = await prisma.ripenessSample.findMany({
    where: { blockId: id },
    orderBy: { sampleDate: "asc" },
  })

  const sensorsResult = await getLatestSensorTilesForBlock(id)
  const sensors = sensorsResult.success ? sensorsResult.data : []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-800 mb-6">{block.name}</h1>
        <BlockForm block={block} />
      </div>

      {sensors.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-stone-800 mb-3">ניטור חיישנים</h2>
          <VineyardSensorGrid sensors={sensors} />
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold text-stone-800 mb-3">היסטוריית דגימות הבשלה</h2>
        <RipenessCharts
          samples={samples.map((s) => ({
            sampleDate: s.sampleDate,
            brix: s.brix,
            ph: s.ph,
            titratableAcidity: s.titratableAcidity,
            clusterWeight: s.clusterWeight,
            blockName: block.name,
          }))}
        />
      </div>
    </div>
  )
}
