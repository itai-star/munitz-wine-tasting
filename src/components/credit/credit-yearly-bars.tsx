import { formatShekels } from "@/lib/credit"
import type { CreditCardInfo, YearlyMonthRow } from "@/server/credit-data"

// Phone-sized version of the yearly chart: twelve month labels do not fit side by side on a
// narrow screen, so each month becomes one horizontal stacked bar instead.
export function CreditYearlyBars({
  cards,
  rows,
}: {
  cards: CreditCardInfo[]
  rows: YearlyMonthRow[]
}) {
  const monthsWithCharges = rows.filter((row) => row.total > 0)
  const largest = Math.max(...monthsWithCharges.map((row) => row.total), 1)

  if (monthsWithCharges.length === 0) {
    return <p className="text-stone-400 text-sm text-center py-6">אין חיובים בשנה הזו</p>
  }

  return (
    <ul className="space-y-2.5">
      {monthsWithCharges.map((row) => (
        <li key={row.month}>
          <div className="flex items-baseline justify-between text-sm mb-1">
            <span className="text-stone-700">{row.label}</span>
            <span className="font-semibold text-stone-800">
              <bdi>{formatShekels(row.total)}</bdi>
            </span>
          </div>
          <div className="flex h-4 rounded overflow-hidden bg-stone-100" role="img" aria-label={row.label}>
            {cards.map((card) => {
              const value = row.byCard[card.id] ?? 0
              if (value <= 0) return null
              return (
                <span
                  key={card.id}
                  className="h-full border-l border-white last:border-l-0"
                  style={{ width: `${(value / largest) * 100}%`, backgroundColor: card.color }}
                  title={`${card.name}: ${formatShekels(value)}`}
                />
              )
            })}
          </div>
        </li>
      ))}
    </ul>
  )
}
