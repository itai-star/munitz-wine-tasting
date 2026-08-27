import { prisma } from "@/lib/prisma"
import { CreateVintageForm } from "@/components/vineyard/create-vintage-form"
import { VintageSelect } from "@/components/vineyard/vintage-select"
import { IntakeForm } from "@/components/intake/intake-form"
import { IntakeTable } from "@/components/intake/intake-table"

export const dynamic = "force-dynamic"

export default async function IntakePage({
  searchParams,
}: {
  searchParams: Promise<{ vintage?: string }>
}) {
  const { vintage: vintageParam } = await searchParams

  const vintages = await prisma.vintage.findMany({ orderBy: { year: "desc" } })

  if (vintages.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-stone-800 mb-6">קליטת ענבים</h1>
        <p className="text-stone-500 mb-4">
          יש ליצור עונה/בציר ראשון לפני רישום קליטות.
        </p>
        <CreateVintageForm />
      </div>
    )
  }

  const selectedVintage =
    vintages.find((v) => v.year === Number(vintageParam)) ?? vintages[0]

  const blocks = await prisma.vineyardBlock.findMany({ orderBy: { name: "asc" } })

  const intakes = await prisma.grapeIntake.findMany({
    where: { vintageId: selectedVintage.id },
    include: { block: { select: { name: true } } },
    orderBy: { intakeDate: "asc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-stone-800">קליטת ענבים</h1>
        <VintageSelect
          vintages={vintages.map((v) => ({ year: v.year, label: v.label }))}
          selectedYear={selectedVintage.year}
        />
      </div>

      {blocks.length === 0 ? (
        <p className="text-stone-500 text-sm">
          יש להוסיף בלוקי כרם לפני רישום קליטות.
        </p>
      ) : (
        <>
          <IntakeForm vintageId={selectedVintage.id} blocks={blocks} />

          <IntakeTable
            intakes={intakes.map((i) => ({
              id: i.id,
              intakeDate: i.intakeDate,
              totalWeightKg: i.totalWeightKg,
              binCount: i.binCount,
              notes: i.notes,
              blockName: i.block.name,
            }))}
          />
        </>
      )}
    </div>
  )
}
