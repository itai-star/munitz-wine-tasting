import {
  BARREL_LITERS,
  EXPECTED_LOSS_PERCENT,
  LITERS_PER_BARREL_WITH_TOPPING,
  TOPPING_LITERS_PER_BARREL,
  planBarrels,
} from "@/lib/barrel-plan"
import type { BarrelCombination, BarrelPlan, BarrelRecord, MixedBarrels, VarietyBarrels } from "@/lib/barrel-plan"
import { Card, Kpi } from "@/components/sales/sales-parts"
import { BarrelRow, barrelsText, colorsByVariety, litersText } from "@/components/finished-wine/barrel-parts"
import { BarrelCombinationsEditor } from "@/components/finished-wine/barrel-combinations-editor"
import { BarrelLeftovers } from "@/components/finished-wine/barrel-leftovers"

function StatusBadge({ plan }: { plan: BarrelPlan }) {
  if (plan.isFinal) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1 text-sm font-extrabold">
        <span aria-hidden="true">✓</span> נתון סופי
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 text-sm font-extrabold">
      <span aria-hidden="true">◐</span> נתון חלקי
    </span>
  )
}

function missingText(leftover: number): string {
  return `חסרים ${(LITERS_PER_BARREL_WITH_TOPPING - leftover).toLocaleString("he-IL")} ליטר לחבית נוספת`
}

function VarietyRow({ entry, color }: { entry: VarietyBarrels; color: string }) {
  return (
    <li className="rounded-xl border border-stone-200 p-3.5 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="flex items-center gap-2 text-lg font-extrabold text-stone-900">
          <span className="h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: color }} aria-hidden="true" />
          {entry.variety}
        </span>
        <span className="text-xl font-extrabold text-stone-900">{entry.barrels > 0 ? barrelsText(entry.barrels) : "אין חבית שלמה"}</span>
      </div>
      <p className={`mt-1 text-sm font-bold ${entry.isFinal ? "text-emerald-800" : "text-amber-800"}`}>
        {entry.isFinal ? "✓ סופי" : "◐ חלקי"} · <bdi>{entry.tanksAtLastStage}</bdi> מתוך <bdi>{entry.tanks}</bdi> מכלים נמדדו אחרי שפייה שנייה
        {entry.isFinal ? "" : ", והשאר בהערכה"} · {entry.isFinal ? "סך הכול" : "צפי"} <bdi>{litersText(entry.liters)}</bdi>
      </p>
      {entry.barrels > 0 && (
        <div className="mt-3">
          <BarrelRow count={entry.barrels} colors={[color]} />
        </div>
      )}
      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-3">
          <dt className="font-semibold text-stone-600">יין למילוי ({TOPPING_LITERS_PER_BARREL} ליטר לחבית)</dt>
          <dd className="font-extrabold text-stone-900"><bdi>{litersText(entry.toppingLiters)}</bdi></dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="font-semibold text-stone-600">שארית</dt>
          <dd className="font-extrabold text-stone-900"><bdi>{litersText(entry.leftoverLiters)}</bdi></dd>
        </div>
      </dl>
      {entry.leftoverLiters > 0 && (
        <p className="mt-1 text-sm font-semibold text-stone-600">
          {entry.inMixedPool ? "השארית עוברת לחבית מעורבת, בהמשך." : missingText(entry.leftoverLiters)}
        </p>
      )}
    </li>
  )
}

function MixedRow({ entry, colors }: { entry: MixedBarrels; colors: Map<string, string> }) {
  const paint = entry.contributions.map((part) => colors.get(part.variety) ?? "#a8a29e")
  return (
    <li className="rounded-xl border border-stone-200 p-3.5 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-lg font-extrabold text-stone-900">{entry.contributions.map((part) => part.variety).join(" + ")}</span>
        <span className="text-xl font-extrabold text-stone-900">{entry.barrels > 0 ? barrelsText(entry.barrels) : "אין חבית מעורבת"}</span>
      </div>
      {entry.barrels > 0 && (
        <div className="mt-3">
          <BarrelRow count={entry.barrels} colors={paint} />
        </div>
      )}
      <ul className="mt-3 flex flex-wrap gap-2">
        {entry.contributions.map((part) => (
          <li key={part.variety} className="flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-sm font-bold text-stone-800">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: colors.get(part.variety) }} aria-hidden="true" />
            {part.variety} · <bdi>{litersText(part.liters)}</bdi>
          </li>
        ))}
      </ul>
      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-3">
          <dt className="font-semibold text-stone-600">יין למילוי</dt>
          <dd className="font-extrabold text-stone-900"><bdi>{litersText(entry.toppingLiters)}</bdi></dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="font-semibold text-stone-600">נשאר בלי חבית</dt>
          <dd className="font-extrabold text-stone-900"><bdi>{litersText(entry.remainderLiters)}</bdi></dd>
        </div>
      </dl>
      {entry.remainderLiters > 0 && <p className="mt-1 text-sm font-semibold text-stone-600">{missingText(entry.remainderLiters)}</p>}
    </li>
  )
}

export function FinishedWineBarrels({
  records,
  combinations,
  allVarieties,
}: {
  records: BarrelRecord[]
  combinations: BarrelCombination[]
  allVarieties: string[]
}) {
  const plan = planBarrels(records, combinations)
  const colors = colorsByVariety([...allVarieties, ...plan.varieties.map((entry) => entry.variety)])

  return (
    <div>
      <h3 className="text-lg font-extrabold text-stone-900">צפי חביות ליין אדום</h3>
      <p className="text-sm text-stone-600 mt-1 mb-4">
        חבית היא {BARREL_LITERS} ליטר. לכל חבית מפרישים בנפרד {TOPPING_LITERS_PER_BARREL} ליטר מאותו יין למילוי, ולכן כל חבית דורשת{" "}
        {LITERS_PER_BARREL_WITH_TOPPING} ליטר. כל זן ממלא חביות לבדו, ורק מה שנשאר מתחת לחבית שלמה מתאחד עם זנים מהשילובים המאושרים.
        הכמות לכל מכל היא המדידה שלו אחרי שפייה שנייה, ואם עוד אין כזו, הכמות אחרי פראס פחות פחת צפוי של {EXPECTED_LOSS_PERCENT}%. רק יין אדום
        נכנס לחביות.
      </p>

      {plan.tanks === 0 ? (
        <Card>
          <p className="text-base text-stone-500">אין עדיין רשומות יין אדום עם זן מוגדר לבציר הזה.</p>
        </Card>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Kpi label="סך החביות לתכנון" value={String(plan.totalBarrels)} />
            <Kpi label="חביות של זן אחד" value={String(plan.pureBarrels)} />
            <Kpi label="חביות מעורבות" value={String(plan.mixedBarrels)} />
            <Kpi label="יין למילוי" value={litersText(plan.toppingLiters)} />
          </div>

          <div
            className={`rounded-2xl border border-s-8 p-4 ${
              plan.isFinal ? "border-emerald-300 border-s-emerald-500 bg-emerald-50" : "border-amber-300 border-s-amber-500 bg-amber-50"
            }`}
          >
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge plan={plan} />
              <p className="text-sm font-bold text-stone-800">
                <bdi>{plan.tanksAtLastStage}</bdi> מתוך <bdi>{plan.tanks}</bdi> מכלי יין אדום נמדדו אחרי שפייה שנייה, והשאר בהערכה של פחת{" "}
                {EXPECTED_LOSS_PERCENT}% מהכמות אחרי פראס.
              </p>
            </div>
            <p className="mt-2 text-sm font-semibold text-stone-700">
              יין שנשאר בלי חבית: <bdi>{litersText(plan.remainderLiters)}</bdi>
              {plan.tanksWithoutVariety > 0 && ` · ${plan.tanksWithoutVariety} מכלים ללא כרם או זן לא נכללו בחישוב`}
            </p>
          </div>

          <Card title="חביות לפי זן" note="ממוין מהזן עם מספר החביות הגבוה ביותר לנמוך.">
            <ul className="space-y-3">
              {plan.varieties.map((entry) => (
                <VarietyRow key={entry.variety} entry={entry} color={colors.get(entry.variety) ?? "#a8a29e"} />
              ))}
            </ul>
          </Card>

          {plan.mixed.length > 0 && (
            <Card title="חביות מעורבות" note="נבנות רק מהשאריות של זנים בשילובים מאושרים, כדי שיהיו כמה שפחות.">
              <ul className="space-y-3">
                {plan.mixed.map((entry) => (
                  <MixedRow key={entry.combinationId} entry={entry} colors={colors} />
                ))}
              </ul>
            </Card>
          )}

          <BarrelLeftovers plan={plan} combinations={combinations} colors={colors} />
        </div>
      )}

      <BarrelCombinationsEditor combinations={combinations} allVarieties={allVarieties} />
    </div>
  )
}
