import { BarrelFlagToggles } from "@/components/barrels/barrel-flag-toggles"
import { Card, Kpi } from "@/components/sales/sales-parts"
import type { BarrelYearRow } from "@/lib/barrel-room"
import { isAvailable } from "@/lib/procurement"
import type { BarrelPurchase } from "@/lib/procurement"

function Status({ row }: { row: BarrelYearRow }) {
  if (row.state !== "IN_STOCK") {
    return <span className="shrink-0 rounded-full border border-stone-300 bg-stone-100 px-2.5 py-0.5 text-xs font-extrabold text-stone-700">הוצאה מהמלאי, לא נספרת</span>
  }
  if (row.lastRound) {
    return <span className="shrink-0 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-900">סבב אחרון, לא נספרת</span>
  }
  return <span className="shrink-0 rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-900">נספרת</span>
}

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${strong ? "border-t border-stone-300 pt-2.5 text-lg font-extrabold text-stone-900" : "text-base font-semibold text-stone-800"}`}>
      <dt>{label}</dt>
      <dd className="whitespace-nowrap font-extrabold">
        <bdi>{value}</bdi>
      </dd>
    </div>
  )
}

// The purchase of barrels for a vintage: the rules, the result with how it is reached, and the barrels of the year before that it
// rests on, each with the marks that decide whether it counts.
export function BarrelPurchaseSection({
  purchase,
  barrels,
  rules,
  canEditMarks,
}: {
  purchase: BarrelPurchase
  barrels: BarrelYearRow[]
  rules: string[]
  canEditMarks: boolean
}) {
  return (
    <section className="space-y-4" aria-label="רכש חביות">
      <h2 className="text-xl font-extrabold text-stone-900">חביות</h2>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi label="חביות דרושות" value={String(purchase.neededBarrels)} />
        <Kpi label={`חביות קיימות מ-${purchase.previousYear}`} value={String(purchase.availableBarrels)} />
        <Kpi label="חביות לרכישה" value={String(purchase.toBuy)} />
        <Kpi label="עודף חביות" value={String(purchase.surplus)} />
      </div>

      {!purchase.hasPlan && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900">
          עדיין אין בציר {purchase.year} במערכת, ולכן אין תכנון חביות. הדרוש מחושב רק מחביות שכבר מלאות ביין של השנה.
        </p>
      )}
      {purchase.hasPlan && !purchase.isPlanFinal && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900">
          תכנון החביות של בציר {purchase.year} עדיין הערכה, כי לא כל המיכלים נמדדו אחרי השפייה השנייה. החישוב יתעדכן במדידות.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="איך מגיעים לתוצאה">
          <dl>
            <Line label={`חביות שכבר מלאות ביין ${purchase.year}`} value={String(purchase.filledBarrels)} />
            <Line label="חביות שעוד נדרשות לפי התכנון" value={String(purchase.plannedBarrels)} />
            <Line label="חביות דרושות" value={String(purchase.neededBarrels)} strong />
            <Line label={`חביות בחדר ב-${purchase.previousYear} שעדיין במלאי`} value={String(purchase.inRoomBarrels)} />
            <Line label="פחות חביות בסבב אחרון" value={String(purchase.lastRoundBarrels)} />
            <Line label="חביות קיימות" value={String(purchase.availableBarrels)} strong />
            <Line label="חביות לרכישה" value={String(purchase.toBuy)} strong />
          </dl>
        </Card>

        <Card title="כללי החישוב">
          <ol className="list-decimal space-y-2 ps-5 text-base font-semibold text-stone-800">
            {rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
        </Card>
      </div>

      <Card title={`החביות של ${purchase.previousYear}`} note="אפשר לשנות כאן את הסימונים, וכך גם בחדר החביות. השינוי נשמר לשנה הזו בלבד.">
        {barrels.length === 0 ? (
          <p className="text-base font-semibold text-stone-500">אין חביות שהיו בשימוש בשנת {purchase.previousYear}.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {barrels.map((row) => (
              <li key={row.id} className={`rounded-xl border border-stone-200 p-3 ${isAvailable(row) ? "bg-white" : "bg-stone-50"}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-lg font-extrabold text-stone-900">
                    חבית <bdi>{row.number}</bdi>
                    <span className="block text-sm font-semibold text-stone-600">
                      {row.type} · שנת חבית <bdi>{row.year}</bdi>
                    </span>
                  </p>
                  <Status row={row} />
                </div>
                <div className="mt-2">
                  <BarrelFlagToggles
                    barrelId={row.id}
                    year={purchase.previousYear}
                    includeInBottling={row.includeInBottling}
                    lastRound={row.lastRound}
                    disabled={!canEditMarks}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  )
}
