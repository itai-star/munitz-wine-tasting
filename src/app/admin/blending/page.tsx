import Link from "next/link"
import { todayKey } from "@/lib/calendar-events"
import { BlendingBoard } from "@/components/blending/blending-board"
import { YearSelect } from "@/components/barrels/year-select"
import { loadBlending } from "@/server/blending-data"
import { loadBarrelYears } from "@/server/barrels-data"

export const dynamic = "force-dynamic"

const linkClass =
  "inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50 transition-colors"

export default async function BlendingPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const currentYear = Number(todayKey().slice(0, 4))
  const years = await loadBarrelYears(currentYear)
  const requested = Number((await searchParams).year)
  const year = years.includes(requested) ? requested : currentYear
  const { wines, pile } = await loadBlending(year)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-800">בלנדינג</h1>
        <div className="flex flex-wrap items-center gap-3">
          <YearSelect year={year} years={years} basePath="/admin/blending" />
          <a href={`/api/blending/export?year=${year}`} download className={linkClass}>
            ייצוא לאקסל
          </a>
          <Link href={`/admin/blending/report?year=${year}&print=1`} className={linkClass}>
            ייצוא PDF
          </Link>
        </div>
      </div>

      <BlendingBoard key={year} year={year} wines={wines} pile={pile} />
    </div>
  )
}
