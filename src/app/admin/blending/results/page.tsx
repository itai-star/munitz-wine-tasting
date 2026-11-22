import Link from "next/link"
import { redirect } from "next/navigation"
import { todayKey } from "@/lib/calendar-events"
import { YearSelect } from "@/components/barrels/year-select"
import { ResultsTable } from "@/components/blending-tasting/results-table"
import type { ResultRow } from "@/components/blending-tasting/results-table"
import { getCurrentUser } from "@/server/auth/session"
import { loadRatingBarrels, loadTasters, loadTastingViews } from "@/server/barrel-rating-data"
import { loadBlending } from "@/server/blending-data"
import { loadBarrelYears } from "@/server/barrels-data"

export const dynamic = "force-dynamic"

// Every barrel of a year with its tasting at a glance, to choose the barrels of each wine.
export default async function TastingResultsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const currentYear = Number(todayKey().slice(0, 4))
  const years = await loadBarrelYears(currentYear)
  const requested = Number((await searchParams).year)
  const year = years.includes(requested) ? requested : currentYear
  const [barrels, tastingOf, { wines, pile }, tasters] = await Promise.all([loadRatingBarrels(year), loadTastingViews(year, user), loadBlending(year, user), loadTasters(year)])

  const remainingOf = new Map(pile.map((barrel) => [barrel.fillId, barrel.remaining]))
  const winesOf = new Map<string, string[]>()
  for (const wine of wines) for (const draw of wine.draws) winesOf.set(draw.fillId, [...(winesOf.get(draw.fillId) ?? []), wine.name])

  const rows: ResultRow[] = barrels.map((barrel) => ({
    fillId: barrel.fillId,
    number: barrel.number,
    type: barrel.type,
    year: barrel.year,
    variety: barrel.variety,
    composition: barrel.parts.map((part) => part.variety).filter((variety, index, all) => all.indexOf(variety) === index).join(" + "),
    tasting: tastingOf(barrel.fillId),
    remaining: remainingOf.get(barrel.fillId) ?? 0,
    wines: winesOf.get(barrel.fillId) ?? [],
  }))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-800">תוצאות הטעימה, בציר {year}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <YearSelect year={year} years={years} basePath="/admin/blending/results" />
          <Link href={`/admin/blending?year=${year}`} className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50">
            חזרה לבלנדינג
          </Link>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-stone-200 bg-white p-6 text-base font-semibold text-stone-700">אין עדיין חביות עם יין של {year}.</p>
      ) : (
        <ResultsTable rows={rows} tasterCount={tasters.length} />
      )}
    </div>
  )
}
