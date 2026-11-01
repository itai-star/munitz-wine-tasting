import { formatPercent } from "@/lib/sales-summary"

export type PieSlice = {
  key: string
  label: string
  value: number
  color: string
  // The text shown on the right of the legend row, such as the amount and its share.
  valueText: string
  detail?: string
  // A legend row can stay out of the pie, for example the wines folded into "the rest".
  inChart?: boolean
  // A slice can also stay out of the legend, when its rows are listed one by one.
  inLegend?: boolean
}

const CIRCUMFERENCE_RADIUS = 15.9155 // a circle of circumference 100, so a slice's length equals its percentage
const GAP = 0.5

// A thin gap between slices, except when a single slice fills the whole ring.
function gapBetween(count: number): number {
  return count > 1 ? GAP : 0
}

// A donut chart drawn in plain SVG with its legend beside it on wide screens and below it on a phone.
export function SalesPie({
  slices,
  centerLabel,
  centerValue,
  ariaLabel,
}: {
  slices: PieSlice[]
  centerLabel: string
  centerValue: string
  ariaLabel: string
}) {
  const drawn = slices.filter((slice) => slice.inChart !== false && slice.value > 0)
  const total = drawn.reduce((sum, slice) => sum + slice.value, 0)
  if (total <= 0) return <p className="text-base text-stone-400">אין נתונים</p>

  const gap = gapBetween(drawn.length)
  const percents = drawn.map((slice) => (slice.value / total) * 100)
  const arcs = drawn.map((slice, index) => ({
    slice,
    percent: percents[index],
    start: percents.slice(0, index).reduce((sum, value) => sum + value, 0),
  }))

  return (
    <div className="@container">
      <div className="flex flex-col @xl:flex-row @xl:items-center gap-5 @xl:gap-8">
        <div className="relative mx-auto @xl:mx-0 w-52 h-52 @xl:w-60 @xl:h-60 shrink-0">
          <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90" role="img" aria-label={ariaLabel}>
            <circle cx="21" cy="21" r={CIRCUMFERENCE_RADIUS} fill="none" stroke="#f5f5f4" strokeWidth="6.5" />
            {arcs.map(({ slice, percent, start }) => (
              <circle
                key={slice.key}
                cx="21"
                cy="21"
                r={CIRCUMFERENCE_RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth="6.5"
                strokeDasharray={`${Math.max(percent - gap, 0.2)} ${100 - percent + gap}`}
                strokeDashoffset={-start}
              >
                <title>{`${slice.label}: ${slice.valueText}`}</title>
              </circle>
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-10 pointer-events-none">
            <span className="text-sm font-semibold text-stone-500">{centerLabel}</span>
            <span className="text-xl @xl:text-2xl font-extrabold text-stone-900 leading-tight">
              <bdi>{centerValue}</bdi>
            </span>
          </div>
        </div>

        <ul className="flex-1 min-w-0 space-y-3">
          {slices
            .filter((slice) => slice.inLegend !== false)
            .map((slice) => (
              <li key={slice.key} className="flex items-start gap-3">
                <span
                  className="mt-1.5 h-4 w-4 shrink-0 rounded-sm"
                  style={{ backgroundColor: slice.color }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-base font-bold text-stone-900 break-words min-w-0">{slice.label}</span>
                    <span className="text-base font-extrabold text-stone-900 whitespace-nowrap">
                      <bdi>{slice.valueText}</bdi>
                    </span>
                  </div>
                  {slice.detail && <p className="text-sm font-medium text-stone-600 mt-0.5">{slice.detail}</p>}
                </div>
              </li>
            ))}
        </ul>
      </div>
    </div>
  )
}

export function shareText(amountText: string, sharePercent: number): string {
  return `${amountText} · ${formatPercent(sharePercent)}`
}
