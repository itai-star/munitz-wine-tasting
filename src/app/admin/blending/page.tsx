import Link from "next/link"
import { redirect } from "next/navigation"
import { todayKey } from "@/lib/calendar-events"
import { BlendingBoard } from "@/components/blending/blending-board"
import { TastersButton } from "@/components/blending/tasters-button"
import { YearSelect } from "@/components/barrels/year-select"
import { getCurrentUser } from "@/server/auth/session"
import { loadTasterCandidates, loadTasters } from "@/server/barrel-rating-data"
import { loadBlending } from "@/server/blending-data"
import { loadBarrelYears } from "@/server/barrels-data"

export const dynamic = "force-dynamic"

const linkClass =
  "inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50 transition-colors"

export default async function BlendingPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  const isAdmin = user.role === "ADMIN"

  const currentYear = Number(todayKey().slice(0, 4))
  const years = await loadBarrelYears(currentYear)
  const requested = Number((await searchParams).year)
  const year = years.includes(requested) ? requested : currentYear
  const [{ wines, pile }, tasters, candidates] = await Promise.all([loadBlending(year, user), loadTasters(year), isAdmin ? loadTasterCandidates() : Promise.resolve([])])
  const isTaster = tasters.some((taster) => taster.userId === user.id)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-800">בלנדינג</h1>
        <div className="flex flex-wrap items-center gap-3">
          <YearSelect year={year} years={years} basePath="/admin/blending" />
          {(isTaster || isAdmin) && (
            <Link href={`/admin/blending/tasting?year=${year}`} className="inline-flex min-h-10 items-center rounded-lg bg-wine px-4 text-sm font-bold text-white hover:bg-wine-dark transition-colors">
              טופס טעימה
            </Link>
          )}
          {isAdmin && <TastersButton key={year} year={year} candidates={candidates} tasters={tasters} />}
          <a href={`/api/blending/export?year=${year}`} download className={linkClass}>
            ייצוא לאקסל
          </a>
          <Link href={`/admin/blending/report?year=${year}&print=1`} className={linkClass}>
            ייצוא PDF
          </Link>
        </div>
      </div>

      <BlendingBoard key={year} year={year} wines={wines} pile={pile} isAdmin={isAdmin} />
    </div>
  )
}
