import { todayKey } from "@/lib/calendar-events"
import { canUse } from "@/lib/permissions"
import { barrelPurchaseRules } from "@/lib/procurement"
import { YearSelect } from "@/components/barrels/year-select"
import { BarrelPurchaseSection } from "@/components/procurement/barrel-purchase-section"
import { getCurrentUser } from "@/server/auth/session"
import { loadBarrelYears } from "@/server/barrels-data"
import { loadProcurement } from "@/server/procurement-data"

export const dynamic = "force-dynamic"

export default async function ProcurementPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const currentYear = Number(todayKey().slice(0, 4))
  const years = Array.from(new Set([currentYear + 1, ...(await loadBarrelYears(currentYear))])).sort((a, b) => b - a)
  const requested = Number((await searchParams).year)
  const year = years.includes(requested) ? requested : currentYear

  const [user, { purchase, previousYearBarrels }] = await Promise.all([getCurrentUser(), loadProcurement(year)])
  const canEditMarks = user !== null && canUse(user, "BARRELS")

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-800">רכש, בציר {year}</h1>
        <YearSelect year={year} years={years} basePath="/admin/procurement" />
      </div>

      <BarrelPurchaseSection purchase={purchase} barrels={previousYearBarrels} rules={barrelPurchaseRules(year)} canEditMarks={canEditMarks} />

      <p className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-base font-semibold text-stone-600">
        בהמשך יתווספו כאן חישובי ההזמנות לארגזים, לפקקים ולבקבוקים.
      </p>
    </div>
  )
}
