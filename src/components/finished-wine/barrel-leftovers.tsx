import { LITERS_PER_BARREL_WITH_TOPPING } from "@/lib/barrel-plan"
import type { BarrelCombination, BarrelPlan, VarietyBarrels } from "@/lib/barrel-plan"
import { Card } from "@/components/sales/sales-parts"
import { litersText } from "@/components/finished-wine/barrel-parts"

type LeftoverRow = { entry: VarietyBarrels; liters: number }

function LeftoverCard({
  title,
  note,
  rows,
  combinations,
  colors,
  emptyText,
}: {
  title: string
  note: string
  rows: LeftoverRow[]
  combinations: BarrelCombination[]
  colors: Map<string, string>
  emptyText: string
}) {
  const total = rows.reduce((sum, row) => sum + row.liters, 0)

  return (
    <Card title={title} note={note}>
      {rows.length === 0 ? (
        <p className="text-base font-bold text-emerald-800">{emptyText}</p>
      ) : (
        <>
          <p className="text-sm font-bold text-stone-700">
            סך הכול <bdi>{litersText(total)}</bdi> ב-<bdi>{rows.length}</bdi> זנים. חבית שלמה דורשת {LITERS_PER_BARREL_WITH_TOPPING} ליטר.
          </p>
          <ul className="mt-4 space-y-4">
            {rows.map(({ entry, liters }) => {
              const partners = combinations
                .filter((combination) => combination.varieties.includes(entry.variety))
                .map((combination) => combination.varieties.filter((variety) => variety !== entry.variety))
              const share = Math.min((liters / LITERS_PER_BARREL_WITH_TOPPING) * 100, 100)
              const color = colors.get(entry.variety) ?? "#a8a29e"

              return (
                <li key={entry.variety}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-2 text-base font-bold text-stone-900">
                      <span className="h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: color }} aria-hidden="true" />
                      {entry.variety}
                    </span>
                    <span className="text-lg font-extrabold text-stone-900 whitespace-nowrap">
                      <bdi>{litersText(liters)}</bdi>
                    </span>
                  </div>
                  <div className="mt-1.5 h-3.5 rounded-full bg-stone-100 overflow-hidden" aria-hidden="true">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(share, 2)}%`, backgroundColor: color }} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                    <span className="font-semibold text-stone-600">
                      חסרים <bdi>{litersText(LITERS_PER_BARREL_WITH_TOPPING - liters)}</bdi> לחבית
                    </span>
                    {partners.length > 0 ? (
                      <span className="font-bold text-emerald-800">ניתן לשלב עם {partners.map((group) => group.join(" + ")).join(" או ")}</span>
                    ) : (
                      <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 font-extrabold text-amber-900">
                        אין שילוב מאושר
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Card>
  )
}

// What each variety has left once its whole barrels and their topping wine are set aside: first before any mixing,
// so the combinations can be decided on it, and then after the mixed barrels. Fresh liters set by hand were taken
// out of the variety before its barrels were worked out, so what the second card lists is not fresh.
export function BarrelLeftovers({
  plan,
  combinations,
  colors,
}: {
  plan: BarrelPlan
  combinations: BarrelCombination[]
  colors: Map<string, string>
}) {
  const byLiters = (a: LeftoverRow, b: LeftoverRow): number => b.liters - a.liters || a.entry.variety.localeCompare(b.entry.variety, "he")
  const before = plan.varieties.filter((entry) => entry.leftoverLiters > 0).map((entry) => ({ entry, liters: entry.leftoverLiters })).sort(byLiters)
  const after = plan.varieties.filter((entry) => entry.remainingLiters > 0).map((entry) => ({ entry, liters: entry.remainingLiters })).sort(byLiters)

  return (
    <>
      {before.length > 0 && (
        <LeftoverCard
          title="יין שנשאר מחוץ לחביות לפני חביות מעורבות"
          note="הכמות מכל זן אחרי החביות השלמות והיין למילוי, לפני כל שילוב. אפשר להסתמך עליה כדי להחליט אילו שילובים להוסיף."
          rows={before}
          combinations={combinations}
          colors={colors}
          emptyText=""
        />
      )}
      <LeftoverCard
        title="יין שנשאר מחוץ לחביות לאחר חביות מעורבות ורענן"
        note="מה שנשאר מכל זן אחרי החביות השלמות, החביות המעורבות והיין שהוגדר ידנית כרענן. הרענן כבר הורד מהחישוב ולכן אינו מופיע כאן."
        rows={after}
        combinations={combinations}
        colors={colors}
        emptyText="לא נשאר יין מחוץ לחביות."
      />
    </>
  )
}
