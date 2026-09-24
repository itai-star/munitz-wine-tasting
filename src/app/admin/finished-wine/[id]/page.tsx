import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { FinishedWineControls } from "@/components/finished-wine/finished-wine-controls"
import { FinishedWineStageChart } from "@/components/finished-wine/finished-wine-charts"
import { LabTestForm } from "@/components/lab-test/lab-test-form"
import { LabTestExcelImport } from "@/components/lab-test/lab-test-excel-import"
import { LabTestTable } from "@/components/lab-test/lab-test-table"

export const dynamic = "force-dynamic"

export default async function FinishedWineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const wine = await prisma.finishedWine.findUnique({
    where: { id },
    include: { vintage: true, block: true },
  })
  if (!wine) notFound()

  const [vintages, blocks, labTests] = await Promise.all([
    prisma.vintage.findMany({ orderBy: { year: "desc" } }),
    prisma.vineyardBlock.findMany({ orderBy: { name: "asc" } }),
    prisma.labTest.findMany({ where: { finishedWineId: id }, orderBy: { testDate: "asc" } }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{wine.tank}</h1>
          <p className="text-sm text-stone-500 mt-1">
            {wine.vintage.label}
            {wine.block && ` · כרם ${wine.block.name}`}
            {` · ${wine.harvestedWeightKg} ק"ג נבצרו`}
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
            blockId: wine.blockId,
            tank: wine.tank,
            harvestedWeightKg: wine.harvestedWeightKg,
            litersAfterPressing: wine.litersAfterPressing,
            litersAfterFirstRacking: wine.litersAfterFirstRacking,
            litersAfterSecondRacking: wine.litersAfterSecondRacking,
          }}
          vintages={vintages.map((v) => ({ id: v.id, label: v.label }))}
          blocks={blocks.map((b) => ({ id: b.id, name: b.name }))}
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

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-stone-800">בדיקות מעבדה</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <LabTestForm finishedWineId={wine.id} />
          <LabTestExcelImport finishedWineId={wine.id} />
        </div>
        <LabTestTable
          tests={labTests.map((t) => ({
            id: t.id,
            testDate: t.testDate,
            lab: t.lab,
            density: t.density,
            ethanol: t.ethanol,
            ph: t.ph,
            totalAcid: t.totalAcid,
            volatile: t.volatile,
            rsBx: t.rsBx,
            co2: t.co2,
            malicAcid: t.malicAcid,
            notes: t.notes,
          }))}
        />
      </div>
    </div>
  )
}
