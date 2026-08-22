import { prisma } from "@/lib/prisma"
import { CreateVintageForm } from "@/components/vineyard/create-vintage-form"
import { VintageSelect } from "@/components/vineyard/vintage-select"
import { SampleBlockFilter } from "@/components/vineyard/sample-block-filter"
import { SampleForm } from "@/components/vineyard/sample-form"
import { SampleExcelImport } from "@/components/vineyard/sample-excel-import"
import { RipenessCharts } from "@/components/vineyard/ripeness-charts"
import { SampleTable } from "@/components/vineyard/sample-table"

export const dynamic = "force-dynamic"

export default async function SamplesPage({
  searchParams,
}: {
  searchParams: Promise<{ vintage?: string; blocks?: string }>
}) {
  const { vintage: vintageParam, blocks: blocksParam } = await searchParams

  const vintages = await prisma.vintage.findMany({ orderBy: { year: "desc" } })

  if (vintages.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-stone-800 mb-6">דגימות הבשלה</h1>
        <p className="text-stone-500 mb-4">
          יש ליצור עונה/בציר ראשון לפני הזנת דגימות.
        </p>
        <CreateVintageForm />
      </div>
    )
  }

  const selectedVintage =
    vintages.find((v) => v.year === Number(vintageParam)) ?? vintages[0]

  const blocks = await prisma.vineyardBlock.findMany({ orderBy: { name: "asc" } })
  const selectedBlockIds = blocksParam ? blocksParam.split(",").filter(Boolean) : []

  const samples = await prisma.ripenessSample.findMany({
    where: {
      vintageId: selectedVintage.id,
      ...(selectedBlockIds.length > 0 ? { blockId: { in: selectedBlockIds } } : {}),
    },
    include: { block: { select: { name: true } } },
    orderBy: { sampleDate: "asc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-stone-800">דגימות הבשלה</h1>
        <VintageSelect
          vintages={vintages.map((v) => ({ year: v.year, label: v.label }))}
          selectedYear={selectedVintage.year}
        />
      </div>

      {blocks.length === 0 ? (
        <p className="text-stone-500 text-sm">
          יש להוסיף בלוקי כרם לפני הזנת דגימות.
        </p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <SampleForm vintageId={selectedVintage.id} blocks={blocks} />
            <SampleExcelImport vintageId={selectedVintage.id} />
          </div>

          <SampleBlockFilter blocks={blocks} selectedBlockIds={selectedBlockIds} />

          <RipenessCharts
            samples={samples.map((s) => ({
              sampleDate: s.sampleDate,
              brix: s.brix,
              ph: s.ph,
              titratableAcidity: s.titratableAcidity,
              blockName: s.block.name,
            }))}
          />

          <SampleTable
            samples={samples.map((s) => ({
              id: s.id,
              sampleDate: s.sampleDate,
              brix: s.brix,
              ph: s.ph,
              titratableAcidity: s.titratableAcidity,
              color: s.color,
              blockName: s.block.name,
            }))}
          />
        </>
      )}
    </div>
  )
}
