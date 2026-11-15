import Link from "next/link"
import { redirect } from "next/navigation"
import { todayKey } from "@/lib/calendar-events"
import { YearSelect } from "@/components/barrels/year-select"
import { RatingScreen } from "@/components/blending-tasting/rating-screen"
import { getCurrentUser } from "@/server/auth/session"
import { loadMyRatings, loadRatingBarrels, loadTasters } from "@/server/barrel-rating-data"
import { loadBarrelYears } from "@/server/barrels-data"

export const dynamic = "force-dynamic"

// The tasting form of the barrels of a year, one barrel at a time, for the tasters chosen for that year.
export default async function BlendingTastingPage({ searchParams }: { searchParams: Promise<{ year?: string; barrel?: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const params = await searchParams
  const currentYear = Number(todayKey().slice(0, 4))
  const years = await loadBarrelYears(currentYear)
  const year = years.includes(Number(params.year)) ? Number(params.year) : currentYear
  const [tasters, barrels, mine] = await Promise.all([loadTasters(year), loadRatingBarrels(year), loadMyRatings(year, user.id)])
  const isTaster = tasters.some((taster) => taster.userId === user.id)

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-stone-800">טופס טעימה, בציר {year}</h1>
      <div className="flex flex-wrap items-center gap-3">
        <YearSelect year={year} years={years} basePath="/admin/blending/tasting" />
        <Link href={`/admin/blending?year=${year}`} className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50">
          חזרה לבלנדינג
        </Link>
      </div>
    </div>
  )

  if (!isTaster) {
    return (
      <div className="space-y-5">
        {header}
        <p className="rounded-2xl border border-stone-200 bg-white p-6 text-base font-semibold text-stone-700">
          אינך ברשימת המשתתפים בטעימה של {year}.
          {user.role === "ADMIN" ? ' אפשר להוסיף את עצמך בכפתור "משתתפי הטעימה" במסך הבלנדינג.' : " מנהל יכול להוסיף אותך לרשימה."}
        </p>
      </div>
    )
  }

  if (barrels.length === 0) {
    return (
      <div className="space-y-5">
        {header}
        <p className="rounded-2xl border border-stone-200 bg-white p-6 text-base font-semibold text-stone-700">
          אין עדיין חביות עם יין של {year}. מזינים יין לחביות בחדר החביות, ואז הן מופיעות כאן.
        </p>
      </div>
    )
  }

  const index = Math.max(0, barrels.findIndex((barrel) => barrel.fillId === params.barrel))
  const startAt = params.barrel ? index : Math.max(0, barrels.findIndex((barrel) => !mine.has(barrel.fillId)))
  const current = barrels[startAt]
  const after = [...barrels.slice(startAt + 1), ...barrels.slice(0, startAt)]
  const next = after.find((barrel) => !mine.has(barrel.fillId)) ?? null

  return (
    <div className="space-y-5">
      {header}
      <RatingScreen
        key={current.fillId}
        year={year}
        barrels={barrels.map((barrel) => ({ fillId: barrel.fillId, number: barrel.number, variety: barrel.variety, rated: mine.has(barrel.fillId) }))}
        barrel={current}
        initial={mine.get(current.fillId) ?? null}
        nextFillId={next?.fillId ?? null}
      />
    </div>
  )
}
