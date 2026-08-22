import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { BlockForm } from "@/components/vineyard/block-form"
import { RipenessCharts } from "@/components/vineyard/ripeness-charts"

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-800 mb-6">{block.name}</h1>
        <BlockForm block={block} />
      </div>

      <div>
        <h2 className="text-lg font-bold text-stone-800 mb-3">היסטוריית דגימות הבשלה</h2>
        <RipenessCharts
          samples={samples.map((s) => ({
            sampleDate: s.sampleDate,
            brix: s.brix,
            ph: s.ph,
            titratableAcidity: s.titratableAcidity,
            blockName: block.name,
          }))}
        />
      </div>
    </div>
  )
}
