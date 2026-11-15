import Link from "next/link"
import { redirect } from "next/navigation"
import { todayKey } from "@/lib/calendar-events"
import { YearSelect } from "@/components/barrels/year-select"
import { ActiveBarrelPanel } from "@/components/blending-tasting/active-barrel-panel"
import { AutoRefresh } from "@/components/blending-tasting/auto-refresh"
import { RatingScreen } from "@/components/blending-tasting/rating-screen"
import { getCurrentUser } from "@/server/auth/session"
import { loadActiveTasting, loadFormCounts, loadMyRatings, loadRatingBarrels, loadTasters } from "@/server/barrel-rating-data"
import { loadBarrelYears } from "@/server/barrels-data"

export const dynamic = "force-dynamic"

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-stone-200 bg-white p-6 text-base font-semibold text-stone-700">{children}</p>
}

// The tasting of the barrels of a year. The tasters fill a form for the barrel an administrator chose to taste now, and can
// open again a barrel they already rated to change their form. The administrator chooses the next barrel once everyone saved.
export default async function BlendingTastingPage({ searchParams }: { searchParams: Promise<{ year?: string; barrel?: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  const isAdmin = user.role === "ADMIN"

  const params = await searchParams
  const currentYear = Number(todayKey().slice(0, 4))
  const years = await loadBarrelYears(currentYear)
  const year = years.includes(Number(params.year)) ? Number(params.year) : currentYear
  const [tasters, barrels, mine, active, forms] = await Promise.all([
    loadTasters(year),
    loadRatingBarrels(year),
    loadMyRatings(year, user.id),
    loadActiveTasting(year),
    isAdmin ? loadFormCounts(year) : Promise.resolve(new Map<string, number>()),
  ])
  const isTaster = tasters.some((taster) => taster.userId === user.id)

  // A barrel asked for by its address opens only if the taster may fill or change its form; otherwise the barrel being tasted.
  const requested = barrels.find((barrel) => barrel.fillId === params.barrel && (barrel.fillId === active.activeFillId || mine.has(barrel.fillId)))
  const current = requested ?? barrels.find((barrel) => barrel.fillId === active.activeFillId)

  return (
    <div className="space-y-5">
      <AutoRefresh />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-800">טופס טעימה, בציר {year}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <YearSelect year={year} years={years} basePath="/admin/blending/tasting" />
          <Link href={`/admin/blending?year=${year}`} className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50">
            חזרה לבלנדינג
          </Link>
        </div>
      </div>

      {isAdmin && barrels.length > 0 && (
        <ActiveBarrelPanel
          key={active.activeFillId ?? "none"}
          year={year}
          barrels={barrels.map((barrel) => ({ fillId: barrel.fillId, number: barrel.number, forms: forms.get(barrel.fillId) ?? 0 }))}
          active={active}
          tasterCount={tasters.length}
        />
      )}

      {barrels.length === 0 ? (
        <Notice>אין עדיין חביות עם יין של {year}. מזינים יין לחביות בחדר החביות, ואז הן מופיעות כאן.</Notice>
      ) : !isTaster ? (
        <Notice>
          אינך ברשימת המשתתפים בטעימה של {year}.
          {isAdmin ? ' אפשר להוסיף את עצמך בכפתור "משתתפי הטעימה" במסך הבלנדינג.' : " מנהל יכול להוסיף אותך לרשימה."}
        </Notice>
      ) : !current ? (
        <Notice>אין כרגע חבית בטעימה. ברגע שמנהל יבחר חבית, היא תופיע כאן מעצמה.</Notice>
      ) : (
        <RatingScreen
          key={current.fillId}
          year={year}
          barrels={barrels.map((barrel) => ({
            fillId: barrel.fillId,
            number: barrel.number,
            variety: barrel.variety,
            rated: mine.has(barrel.fillId),
            isActive: barrel.fillId === active.activeFillId,
          }))}
          barrel={current}
          initial={mine.get(current.fillId) ?? null}
          isActive={current.fillId === active.activeFillId}
          waiting={active.waiting}
        />
      )}
    </div>
  )
}
