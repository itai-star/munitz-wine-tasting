import { prisma } from "@/lib/prisma"
import { CreateVintageForm } from "@/components/vineyard/create-vintage-form"
import { VintageSelect } from "@/components/vineyard/vintage-select"
import { IntakeByWeekTable } from "@/components/season-summary/intake-by-week-table"
import { VarietyWeightChart } from "@/components/season-summary/variety-weight-chart"
import { VarietyExtractionTable } from "@/components/season-summary/variety-extraction-table"
import {
  groupIntakeByVarietyAndWeek,
  sumIntakeByVariety,
  calculateExtractionByVariety,
} from "@/lib/season-summary"

export const dynamic = "force-dynamic"

export default async function SeasonSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ vintage?: string }>
}) {
  const { vintage: vintageParam } = await searchParams
  const vintages = await prisma.vintage.findMany({ orderBy: { year: "desc" } })

  if (vintages.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-stone-800 mb-6">סיכום עונה</h1>
        <p className="text-stone-500 mb-4">יש ליצור עונה/בציר ראשון כדי לראות סיכום.</p>
        <CreateVintageForm />
      </div>
    )
  }

  const selectedVintage = vintages.find((v) => v.year === Number(vintageParam)) ?? vintages[0]

  const [intakes, finishedWines] = await Promise.all([
    prisma.grapeIntake.findMany({
      where: { vintageId: selectedVintage.id },
      include: { block: { select: { variety: true } } },
    }),
    prisma.finishedWine.findMany({
      where: { vintageId: selectedVintage.id, blockId: { not: null } },
      include: { block: { select: { variety: true } } },
    }),
  ])

  const intakeRecords = intakes.map((intake) => ({
    intakeDate: intake.intakeDate,
    totalWeightKg: intake.totalWeightKg,
    variety: intake.block.variety,
  }))

  const finishedWineRecords = finishedWines
    .filter(
      (wine): wine is typeof wine & { block: { variety: string } } => wine.block !== null
    )
    .map((wine) => ({
      variety: wine.block.variety,
      harvestedWeightKg: wine.harvestedWeightKg,
      litersAfterPressing: wine.litersAfterPressing,
      litersAfterFirstRacking: wine.litersAfterFirstRacking,
      litersAfterSecondRacking: wine.litersAfterSecondRacking,
    }))

  const { weeks, varieties } = groupIntakeByVarietyAndWeek(intakeRecords)
  const varietyTotals = sumIntakeByVariety(intakeRecords)
  const extractionRows = calculateExtractionByVariety(finishedWineRecords)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-stone-800">סיכום עונה — {selectedVintage.label}</h1>
        <VintageSelect
          vintages={vintages.map((v) => ({ year: v.year, label: v.label }))}
          selectedYear={selectedVintage.year}
        />
      </div>

      <IntakeByWeekTable weeks={weeks} varieties={varieties} />
      <VarietyWeightChart rows={varietyTotals} />
      <VarietyExtractionTable rows={extractionRows} />
    </div>
  )
}
