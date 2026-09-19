import type { WeekIntakeRow } from "@/lib/season-summary"

function formatKg(value: number): string {
  return value.toLocaleString("he-IL")
}

export function IntakeByWeekTable({
  weeks,
  varieties,
}: {
  weeks: WeekIntakeRow[]
  varieties: string[]
}) {
  if (weeks.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
        <h3 className="text-sm font-medium text-stone-700 mb-3">קליטת ענבים לפי זן ולפי שבוע</h3>
        <p className="text-stone-400 text-sm text-center py-8">אין עדיין נתוני קליטה לבציר זה</p>
      </div>
    )
  }

  const varietyTotals = varieties.map((variety) =>
    weeks.reduce((sum, week) => sum + (week.byVariety[variety] ?? 0), 0)
  )
  const grandTotal = weeks.reduce((sum, week) => sum + week.total, 0)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 overflow-x-auto">
      <h3 className="text-sm font-medium text-stone-700 mb-3">
        קליטת ענבים לפי זן ולפי שבוע (ק&quot;ג)
      </h3>
      <table className="w-full text-sm border-collapse min-w-max">
        <thead>
          <tr>
            <th className="px-3 py-2 border-b border-stone-200 text-start whitespace-nowrap">שבוע</th>
            {varieties.map((variety) => (
              <th
                key={variety}
                className="px-3 py-2 border-b border-stone-200 text-center whitespace-nowrap"
              >
                {variety}
              </th>
            ))}
            <th className="px-3 py-2 border-b border-stone-200 text-center whitespace-nowrap font-semibold">
              סה&quot;כ
            </th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.label} className="border-b border-stone-100">
              <td className="px-3 py-2 font-medium whitespace-nowrap">משבוע {week.label}</td>
              {varieties.map((variety) => (
                <td key={variety} className="px-3 py-2 text-center text-stone-600">
                  {week.byVariety[variety] ? formatKg(week.byVariety[variety]) : "—"}
                </td>
              ))}
              <td className="px-3 py-2 text-center font-semibold">{formatKg(week.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="px-3 py-2 font-semibold whitespace-nowrap">סה&quot;כ</td>
            {varietyTotals.map((total, i) => (
              <td key={varieties[i]} className="px-3 py-2 text-center font-semibold">
                {formatKg(total)}
              </td>
            ))}
            <td className="px-3 py-2 text-center font-semibold">{formatKg(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
