import { prisma } from "@/lib/prisma"
import { CreateVintageForm } from "@/components/vineyard/create-vintage-form"
import { VintageSelect } from "@/components/vineyard/vintage-select"
import { SampleBlockFilter } from "@/components/vineyard/sample-block-filter"
import { SampleForm } from "@/components/vineyard/sample-form"
import { SampleExcelImport } from "@/components/vineyard/sample-excel-import"
import { RipenessCharts } from "@/components/vineyard/ripeness-charts"

export const dynamic = "force-dynamic"

export default async function SamplesPage({
  searchParams,
}: {
  searchParams: Promise<{ vintage?: string; block?: string }>
}) {
  const { vintage: vintageParam, block: blockParam } = await searchParams

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
  const selectedBlockId = blockParam ?? ""

  const samples = await prisma.ripenessSample.findMany({
    where: {
      vintageId: selectedVintage.id,
      ...(selectedBlockId ? { blockId: selectedBlockId } : {}),
    },
    include: { block: { select: { name: true } } },
    orderBy: { sampleDate: "asc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-stone-800">דגימות הבשלה</h1>
        <div className="flex gap-4 flex-wrap">
          <VintageSelect
            vintages={vintages.map((v) => ({ year: v.year, label: v.label }))}
            selectedYear={selectedVintage.year}
          />
          <SampleBlockFilter blocks={blocks} selectedBlockId={selectedBlockId} />
        </div>
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

          <RipenessCharts
            samples={samples.map((s) => ({
              sampleDate: s.sampleDate,
              brix: s.brix,
              ph: s.ph,
              titratableAcidity: s.titratableAcidity,
              blockName: s.block.name,
            }))}
          />

          <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 text-right">
                  <th className="px-4 py-2 font-medium">תאריך</th>
                  <th className="px-4 py-2 font-medium">כרם</th>
                  <th className="px-4 py-2 font-medium">בומה</th>
                  <th className="px-4 py-2 font-medium">PH</th>
                  <th className="px-4 py-2 font-medium">חמיצות</th>
                  <th className="px-4 py-2 font-medium">צבע</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((s) => (
                  <tr key={s.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-2">
                      {new Date(s.sampleDate).toLocaleDateString("he-IL")}
                    </td>
                    <td className="px-4 py-2">{s.block.name}</td>
                    <td className="px-4 py-2">{s.brix ?? "—"}</td>
                    <td className="px-4 py-2">{s.ph ?? "—"}</td>
                    <td className="px-4 py-2">{s.titratableAcidity ?? "—"}</td>
                    <td className="px-4 py-2">{s.color ?? "—"}</td>
                  </tr>
                ))}
                {samples.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-stone-400">
                      אין עדיין דגימות לעונה זו
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
