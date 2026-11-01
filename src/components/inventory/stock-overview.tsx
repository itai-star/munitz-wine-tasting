import { formatCount } from "@/lib/sales-summary"
import { STOCK_TYPE_COLORS, STOCK_TYPE_KEYS, STOCK_TYPE_LABELS, summarizeStock } from "@/lib/wine-stock"
import type { StockWine } from "@/lib/wine-stock"
import { Card, Kpi } from "@/components/sales/sales-parts"
import { SalesPie } from "@/components/sales/sales-pie"
import type { PieSlice } from "@/components/sales/sales-pie"

function percentText(value: number): string {
  return `${value.toFixed(1)}%`
}

export function StockOverview({ wines }: { wines: StockWine[] }) {
  const overview = summarizeStock(wines)

  if (overview.totalBottles <= 0) {
    return (
      <Card title="מלאי היינות">
        <p className="text-base text-stone-500">אין כרגע יינות במלאי.</p>
      </Card>
    )
  }

  const slices: PieSlice[] = overview.byType.map((entry) => ({
    key: entry.key,
    label: STOCK_TYPE_LABELS[entry.key],
    value: entry.bottles,
    color: STOCK_TYPE_COLORS[entry.key],
    valueText: `${formatCount(entry.bottles)} בקבוקים`,
    detail: `${percentText(entry.share)} מהמלאי · ${entry.wines} יינות`,
  }))
  const biggest = overview.rows[0]
  const usedTypes = STOCK_TYPE_KEYS.filter((key) => overview.byType.some((entry) => entry.key === key))

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Kpi label="סך הבקבוקים במלאי" value={formatCount(overview.totalBottles)} />
        <Kpi label="יינות במלאי" value={formatCount(overview.winesInStock)} />
        <div className="col-span-2 lg:col-span-1">
          <Kpi label={`המלאי הגדול ביותר: ${biggest.label}`} value={`${formatCount(biggest.quantity)} בקבוקים`} />
        </div>
      </div>

      <Card title="מלאי לפי סוג יין">
        <SalesPie
          slices={slices}
          centerLabel="בקבוקים"
          centerValue={formatCount(overview.totalBottles)}
          ariaLabel="חלוקת המלאי לפי סוג יין"
        />
      </Card>

      <Card title="מלאי לפי יין" note="אורך הפס הוא הכמות ביחס ליין עם המלאי הגדול ביותר, והאחוז הוא החלק מכלל המלאי.">
        <ul className="space-y-4">
          {overview.rows.map((row) => (
            <li key={row.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-base font-bold text-stone-900 min-w-0 break-words">{row.label}</span>
                <span className="text-base font-extrabold text-stone-900 whitespace-nowrap">
                  <bdi>{formatCount(row.quantity)}</bdi>
                  <span className="text-sm font-semibold text-stone-600 ms-2">
                    <bdi>{percentText(row.share)}</bdi>
                  </span>
                </span>
              </div>
              <div className="mt-1.5 h-3.5 rounded-full bg-stone-100 overflow-hidden" aria-hidden="true">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max((row.quantity / biggest.quantity) * 100, 1.5)}%`,
                    backgroundColor: STOCK_TYPE_COLORS[row.type],
                  }}
                />
              </div>
            </li>
          ))}
        </ul>

        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2" aria-label="מקרא צבעים">
          {usedTypes.map((key) => (
            <li key={key} className="flex items-center gap-2 text-sm font-semibold text-stone-700">
              <span className="h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: STOCK_TYPE_COLORS[key] }} aria-hidden="true" />
              {STOCK_TYPE_LABELS[key]}
            </li>
          ))}
        </ul>

        {overview.soldOut.length > 0 && (
          <p className="mt-5 text-sm font-semibold text-stone-600">
            אזלו מהמלאי: {overview.soldOut.map((row) => row.label).join(", ")}
          </p>
        )}
      </Card>
    </div>
  )
}
