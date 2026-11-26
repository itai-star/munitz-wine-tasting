import Link from "next/link"
import { redirect } from "next/navigation"
import { todayKey } from "@/lib/calendar-events"
import { YearSelect } from "@/components/barrels/year-select"
import { AutoPrint } from "@/components/blending/auto-print"
import { SummaryWineCard } from "@/components/blending/summary-wine-card"
import { PrintButton } from "@/components/season-summary/print-button"
import { summarizeBlend } from "@/lib/blend-summary"
import { getCurrentUser } from "@/server/auth/session"
import { loadBlending } from "@/server/blending-data"
import { loadBarrelYears } from "@/server/barrels-data"

export const dynamic = "force-dynamic"

const linkClass = "inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50 transition-colors"

// The blending of a year as it stands: the wines whose composition is final, to read, to export to Excel and to save as a PDF.
export default async function BlendingSummaryPage({ searchParams }: { searchParams: Promise<{ year?: string; print?: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const params = await searchParams
  const currentYear = Number(todayKey().slice(0, 4))
  const years = await loadBarrelYears(currentYear)
  const year = years.includes(Number(params.year)) ? Number(params.year) : currentYear
  const { wines } = await loadBlending(year, user)
  const summary = summarizeBlend(wines)
  const liters = summary.reduce((sum, wine) => sum + wine.totalLiters, 0)
  const bottles = summary.reduce((sum, wine) => sum + wine.bottles, 0)
  const unfinished = wines.length - summary.length

  return (
    <div className="space-y-5">
      <style>{"@media print { @page { size: A4 portrait; margin: 12mm } .wine-page { break-inside: avoid; page-break-inside: avoid } }"}</style>
      <AutoPrint enabled={params.print === "1"} />

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-2xl font-bold text-stone-800">סיכום בלנדינג {year}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <YearSelect year={year} years={years} basePath="/admin/blending/summary" />
          <a href={`/api/blending/summary?year=${year}`} download className={linkClass}>
            ייצוא לאקסל
          </a>
          <PrintButton label="הדפסה או שמירה כ-PDF" />
          <Link href={`/admin/blending?year=${year}`} className={linkClass}>
            חזרה לבלנדינג
          </Link>
        </div>
      </div>

      <header className="hidden print:block">
        <h1 className="text-3xl font-extrabold text-stone-900">יקב מוניץ, סיכום בלנדינג {year}</h1>
        <p className="text-sm text-stone-600">
          הופק ב-<bdi>{todayKey().split("-").reverse().join(".")}</bdi>
        </p>
      </header>

      {summary.length === 0 ? (
        <p className="rounded-2xl border border-stone-200 bg-white p-6 text-base font-semibold text-stone-700">
          אין עדיין יינות עם הרכב סופי בבלנדינג {year}. מסמנים &quot;הרכב סופי&quot; על מיכל, והוא מופיע כאן.
        </p>
      ) : (
        <>
          <p className="text-base font-bold text-stone-800">
            <bdi>{summary.length}</bdi> {summary.length === 1 ? "יין" : "יינות"} עם הרכב סופי · <bdi>{liters.toLocaleString("he-IL")}</bdi> ליטר · כ-
            <bdi>{bottles.toLocaleString("he-IL")}</bdi> בקבוקים (הערכה לפי 750 מ״ל, לפני פחת בביקבוק)
          </p>
          {unfinished > 0 && (
            <p className="text-sm font-semibold text-amber-800 print:hidden">
              <bdi>{unfinished}</bdi> {unfinished === 1 ? "מיכל" : "מיכלים"} בלי סימון &quot;הרכב סופי&quot; לא כלולים בסיכום.
            </p>
          )}
          {summary.map((wine) => (
            <SummaryWineCard key={wine.id} wine={wine} />
          ))}
        </>
      )}
    </div>
  )
}
