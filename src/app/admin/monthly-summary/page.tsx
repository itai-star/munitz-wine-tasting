import Link from "next/link"
import { hebrewMonthName } from "@/lib/credit"
import { SalesClassifyPanel } from "@/components/sales/sales-classify-panel"
import { SalesImportPanel } from "@/components/sales/sales-import-panel"
import { SalesMonthView } from "@/components/sales/sales-month-view"
import { SalesYearSelect } from "@/components/sales/sales-year-select"
import { SalesYearView } from "@/components/sales/sales-year-view"
import { loadSalesOverview } from "@/server/sales-data"

export const dynamic = "force-dynamic"

type SearchParams = { year?: string; month?: string; vintages?: string }

export default async function MonthlySummaryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const overview = await loadSalesOverview(await searchParams)
  const hasData = overview.monthsWithData.length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold text-stone-900">סיכום חודשי</h1>
        <SalesYearSelect year={overview.year} years={overview.years} />
      </div>

      {hasData && (
        <Link
          href={`/admin/monthly-summary?year=${overview.year}&month=${overview.selectedMonth}${overview.byVintage ? "" : "&vintages=1"}`}
          className="inline-block text-sm text-wine hover:underline"
        >
          {overview.byVintage ? "איחוד הבצירים של אותו יין" : "פירוט כל יין לפי בציר"}
        </Link>
      )}

      <details open={!hasData} className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
        <summary className="cursor-pointer text-base font-bold text-wine">ייבוא נתוני מכירות מאקסל</summary>
        <div className="mt-3">
          <SalesImportPanel year={overview.year} />
        </div>
      </details>

      <SalesClassifyPanel customers={overview.unclassified} />

      {!hasData && <p className="text-stone-500">עדיין אין נתוני מכירות לשנת {overview.year}. אפשר לייבא אותם מהקובץ.</p>}

      {hasData && overview.monthSummary && (
        <section className="space-y-3" aria-label="סיכום החודש">
          <h2 className="text-2xl font-extrabold text-stone-900">
            סיכום {overview.monthSummary.label} {overview.year}
          </h2>
          <nav aria-label="בחירת חודש" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {overview.monthsWithData.map((month) => {
              const isActive = month === overview.selectedMonth
              return (
                <Link
                  key={month}
                  href={`/admin/monthly-summary?year=${overview.year}&month=${month}${overview.byVintage ? "&vintages=1" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                  className={`shrink-0 inline-flex items-center rounded-full px-4 min-h-11 text-base font-bold border transition-colors ${
                    isActive ? "bg-wine text-white border-wine" : "bg-white text-stone-700 border-stone-200 hover:border-wine/40"
                  }`}
                >
                  {hebrewMonthName(month)}
                </Link>
              )
            })}
          </nav>
          <SalesMonthView summary={overview.monthSummary} />
        </section>
      )}

      {hasData && (
        <section className="space-y-3" aria-label="סיכום השנה">
          <h2 className="text-2xl font-extrabold text-stone-900">סיכום שנתי {overview.year}</h2>
          <SalesYearView summary={overview.yearSummary} />
        </section>
      )}
    </div>
  )
}
