import { prisma } from "@/lib/prisma"
import { CreateVintageForm } from "@/components/vineyard/create-vintage-form"
import { IntakeByWeekTable } from "@/components/season-summary/intake-by-week-table"
import { VarietyWeightChart } from "@/components/season-summary/variety-weight-chart"
import { VarietyExtractionTable } from "@/components/season-summary/variety-extraction-table"
import { PrintButton } from "@/components/season-summary/print-button"
import { loadSeasonSummary } from "@/server/season-summary-data"

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

  const { weeks, varieties, varietyTotals, extractionRows } = await loadSeasonSummary(
    selectedVintage.id
  )

  return (
    <div className="space-y-6">
      <style>{"@media print { @page { size: A4 landscape; margin: 10mm } }"}</style>
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">סיכום עונה — {selectedVintage.label}</h1>
          <p className="hidden print:block text-sm text-stone-500 mt-1">
            יקב מוניץ · הופק בתאריך {new Date().toLocaleDateString("he-IL")}
          </p>
        </div>
        <div className="flex gap-4 items-center flex-wrap print:hidden">
          <a
            href={`/api/season-summary/export?vintage=${selectedVintage.year}`}
            className="border border-stone-300 text-stone-700 px-4 py-2 rounded-lg hover:bg-stone-50 transition-colors text-sm font-medium"
          >
            ייצוא לאקסל
          </a>
          <PrintButton label="ייצוא ל-PDF" />
        </div>
      </div>

      <VarietyWeightChart rows={varietyTotals} />
      <IntakeByWeekTable weeks={weeks} varieties={varieties} />
      <VarietyExtractionTable rows={extractionRows} />
    </div>
  )
}
