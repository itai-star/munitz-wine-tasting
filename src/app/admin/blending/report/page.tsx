import Link from "next/link"
import { compositionOf, wineLabOf } from "@/lib/blending"
import { todayKey } from "@/lib/calendar-events"
import { AutoPrint } from "@/components/blending/auto-print"
import { colorsByVariety } from "@/components/finished-wine/barrel-parts"
import { PrintButton } from "@/components/season-summary/print-button"
import { SalesPie } from "@/components/sales/sales-pie"
import { loadBlending } from "@/server/blending-data"

export const dynamic = "force-dynamic"

// The composition of the wines of a year as a report to print or to save as a PDF: for each wine its name, its
// description, and a chart of the varieties with their shares and liters.
export default async function BlendingReportPage({ searchParams }: { searchParams: Promise<{ year?: string; print?: string }> }) {
  const params = await searchParams
  const year = Number(params.year) || Number(todayKey().slice(0, 4))
  const { wines, pile } = await loadBlending(year)
  const colors = colorsByVariety(wines.flatMap((wine) => wine.draws.flatMap((draw) => draw.parts.map((part) => part.variety))))

  return (
    <div className="space-y-6">
      <style>{"@media print { @page { size: A4 portrait; margin: 12mm } .wine-page { break-inside: avoid; page-break-inside: avoid } }"}</style>
      <AutoPrint enabled={params.print === "1"} />

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-2xl font-bold text-stone-800">דוח הרכב היינות, בלנדינג {year}</h1>
        <div className="flex gap-3">
          <PrintButton label="הדפסה או שמירה כ-PDF" />
          <Link href={`/admin/blending?year=${year}`} className="border border-stone-300 text-stone-700 px-4 py-2 rounded-lg hover:bg-stone-50 text-sm font-medium">
            חזרה לבלנדינג
          </Link>
        </div>
      </div>

      <header className="hidden print:block">
        <h1 className="text-3xl font-extrabold text-stone-900">יקב מוניץ, הרכב היינות של בלנדינג {year}</h1>
      </header>

      {wines.length === 0 && <p className="text-lg text-stone-500">אין יינות בבלנדינג {year}.</p>}

      {wines.map((wine) => {
        const composition = compositionOf(wine.draws)
        const lab = wineLabOf(wine.draws)
        return (
          <section key={wine.id} className="wine-page rounded-2xl border border-stone-300 bg-white p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-2xl font-extrabold text-stone-900">{wine.name}</h2>
              <span className="text-lg font-bold text-stone-700">
                <bdi>{composition.totalLiters.toLocaleString("he-IL")}</bdi> ליטר · <bdi>{wine.draws.length}</bdi> חביות
                {wine.finalized ? " · ✓ הרכב סופי" : " · הרכב בבנייה"}
              </span>
            </div>
            {wine.description && <p className="mt-2 whitespace-pre-line text-base text-stone-700">{wine.description}</p>}
            {(lab.ethanol.value !== null || lab.ph.value !== null) && (
              <p className="mt-2 text-base font-bold text-stone-800">
                {lab.ethanol.value !== null && <>אלכוהול <bdi>{lab.ethanol.value}%</bdi></>}
                {lab.ethanol.value !== null && lab.ph.value !== null && " · "}
                {lab.ph.value !== null && <>pH <bdi>{lab.ph.value}</bdi></>}
                {(lab.ethanol.barrels < lab.totalBarrels || lab.ph.barrels < lab.totalBarrels) && <span className="text-sm font-semibold text-stone-500"> (לא כל החביות נבדקו)</span>}
              </p>
            )}
            <div className="mt-4">
              {composition.byVariety.length === 0 ? (
                <p className="text-base text-stone-500">עדיין לא נוספו חביות ליין הזה.</p>
              ) : (
                <SalesPie
                  slices={composition.byVariety.map((share) => ({
                    key: share.variety,
                    label: share.variety,
                    value: share.liters,
                    color: colors.get(share.variety) ?? "#a8a29e",
                    valueText: `${share.percent}% · ${share.liters.toLocaleString("he-IL")} ליטר`,
                    detail: `חביות: ${share.barrels.map((barrel) => barrel.number).join(", ")}`,
                  }))}
                  centerLabel="ליטר"
                  centerValue={composition.totalLiters.toLocaleString("he-IL")}
                  ariaLabel={`הרכב היין ${wine.name} לפי זן`}
                />
              )}
            </div>
          </section>
        )
      })}

      {pile.length > 0 && (
        <p className="text-sm text-stone-500 print:text-xs">
          {pile.length} חביות עם יין עדיין לא שולבו ביינות, בהן {Math.round(pile.reduce((sum, barrel) => sum + barrel.remaining, 0)).toLocaleString("he-IL")} ליטר.
        </p>
      )}
    </div>
  )
}
