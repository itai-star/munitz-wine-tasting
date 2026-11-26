import { partialNote } from "@/lib/blend-summary"
import type { WineSummary } from "@/lib/blend-summary"
import type { WineLabValue } from "@/lib/blending"

function Value({ label, value, unit, total }: { label: string; value: WineLabValue; unit?: string; total: number }) {
  const note = partialNote(value, total)
  return (
    <div className="rounded-xl border border-stone-200 px-3 py-2">
      <p className="text-sm font-bold text-stone-600">{label}</p>
      <p className="text-xl font-extrabold text-stone-900">{value.value === null ? <span className="text-stone-400">אין נתונים</span> : <bdi>{value.value}{unit}</bdi>}</p>
      {note && <p className="text-xs font-semibold text-amber-800">{note}</p>}
    </div>
  )
}

const cell = "border-t border-stone-200 py-1.5 pe-3 text-start text-sm"

// One wine of the blending summary: its description, composition by variety, alcohol and pH, and the barrels it comes from.
export function SummaryWineCard({ wine }: { wine: WineSummary }) {
  return (
    <section className="wine-page space-y-4 rounded-2xl border border-stone-300 bg-white p-5" aria-label={`סיכום ${wine.name}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-2xl font-extrabold text-stone-900">{wine.name}</h2>
        <span className="text-base font-bold text-stone-700">
          <bdi>{wine.totalLiters.toLocaleString("he-IL")}</bdi> ליטר · כ-<bdi>{wine.bottles.toLocaleString("he-IL")}</bdi> בקבוקים · <bdi>{wine.barrels.length}</bdi> חביות
        </span>
      </div>

      <div>
        <h3 className="text-sm font-bold text-stone-500">תיאור היין</h3>
        {wine.description ? <p className="whitespace-pre-line text-base text-stone-800">{wine.description}</p> : <p className="text-sm font-semibold text-stone-400">לא הוזן תיאור</p>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Value label="אלכוהול" unit="%" value={wine.lab.ethanol} total={wine.lab.totalBarrels} />
        <Value label="pH" value={wine.lab.ph} total={wine.lab.totalBarrels} />
        <Value label="ביסולפיט חופשי" value={wine.lab.freeBisulfite} total={wine.lab.totalBarrels} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2">
        <div>
          <h3 className="mb-1 text-base font-extrabold text-stone-900">הרכב זני</h3>
          <table className="w-full">
            <thead>
              <tr className="text-xs font-bold text-stone-500">
                <th scope="col" className="pb-1 text-start">זן</th>
                <th scope="col" className="pb-1 text-start">אחוז</th>
                <th scope="col" className="pb-1 text-start">ליטרים</th>
              </tr>
            </thead>
            <tbody>
              {wine.varieties.map((entry) => (
                <tr key={entry.variety}>
                  <td className={`${cell} font-bold text-stone-900`}>{entry.variety}</td>
                  <td className={cell}>
                    <bdi>{entry.percent}%</bdi>
                  </td>
                  <td className={cell}>
                    <bdi>{entry.liters.toLocaleString("he-IL")}</bdi>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {wine.blocks.length > 0 && <p className="mt-2 text-sm font-semibold text-stone-600">כרמים: {wine.blocks.join(", ")}</p>}
        </div>

        <div>
          <h3 className="mb-1 text-base font-extrabold text-stone-900">החביות</h3>
          <table className="w-full">
            <thead>
              <tr className="text-xs font-bold text-stone-500">
                <th scope="col" className="pb-1 text-start">חבית</th>
                <th scope="col" className="pb-1 text-start">ליטרים</th>
                <th scope="col" className="pb-1 text-start">זן</th>
              </tr>
            </thead>
            <tbody>
              {wine.barrels.map((barrel) => (
                <tr key={barrel.number}>
                  <td className={`${cell} font-bold text-stone-900`}>
                    <bdi>{barrel.number}</bdi>
                  </td>
                  <td className={cell}>
                    <bdi>{barrel.liters}</bdi>
                  </td>
                  <td className={cell}>{barrel.varieties}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
