import type { VarietyExtractionRow } from "@/lib/season-summary"

function formatPercent(value: number | null): string {
  return value == null ? "—" : `${value.toFixed(1)}%`
}

export function VarietyExtractionTable({ rows }: { rows: VarietyExtractionRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
        <h3 className="text-sm font-medium text-stone-700 mb-3">אחוזי מיצוי לפי זן</h3>
        <p className="text-stone-400 text-sm text-center py-8">
          אין עדיין רשומות יין מוכן המשויכות לכרם עבור בציר זה
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 overflow-x-auto">
      <h3 className="text-sm font-medium text-stone-700 mb-3">אחוזי מיצוי לפי זן</h3>
      <table className="w-full text-sm border-collapse min-w-max">
        <thead>
          <tr>
            <th className="px-3 py-2 border-b border-stone-200 text-start whitespace-nowrap">זן</th>
            <th className="px-3 py-2 border-b border-stone-200 text-center whitespace-nowrap">
              נבצר (ק&quot;ג)
            </th>
            <th className="px-3 py-2 border-b border-stone-200 text-center whitespace-nowrap">
              אחרי פראס
            </th>
            <th className="px-3 py-2 border-b border-stone-200 text-center whitespace-nowrap">
              אחרי שפייה ראשונה
            </th>
            <th className="px-3 py-2 border-b border-stone-200 text-center whitespace-nowrap">
              אחרי שפייה שנייה
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.variety} className="border-b border-stone-100">
              <td className="px-3 py-2 font-medium whitespace-nowrap">{row.variety}</td>
              <td className="px-3 py-2 text-center text-stone-600">
                {row.harvestedWeightKg.toLocaleString("he-IL")}
              </td>
              <td className="px-3 py-2 text-center text-stone-600">
                {formatPercent(row.afterPressingPercent)}
              </td>
              <td className="px-3 py-2 text-center text-stone-600">
                {formatPercent(row.afterFirstRackingPercent)}
              </td>
              <td className="px-3 py-2 text-center text-stone-600">
                {formatPercent(row.afterSecondRackingPercent)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
