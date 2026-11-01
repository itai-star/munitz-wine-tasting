import { formatShekels } from "@/lib/credit"
import { formatCount, formatSignedPercent } from "@/lib/sales-summary"
import { SalesPie, shareText } from "@/components/sales/sales-pie"
import type { PieSlice } from "@/components/sales/sales-pie"
import { TYPE_KEYS, TYPE_LABELS } from "@/server/sales-data"
import type { CustomerRow, TypeKey, TypeRow, TypeSplit, WineRow } from "@/server/sales-data"

export const TYPE_COLORS: Record<TypeKey, string> = {
  PRIVATE: "#722F37",
  WHOLESALE: "#0f766e",
  UNCLASSIFIED: "#a8a29e",
}

const CATEGORY_COLORS = ["#722F37", "#0f766e", "#b45309", "#1d4ed8", "#7c3aed", "#be185d", "#0e7490", "#4d7c0f", "#c2410c", "#475569"]
const REST_COLOR = "#a8a29e"
// The wine chart colours its eight biggest wines and folds the rest into one grey slice.
const COLORED_ROWS = 8

export function Card({ title, note, children }: { title?: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5 sm:p-6">
      {title && <h3 className="text-lg sm:text-xl font-extrabold text-stone-900">{title}</h3>}
      {note && <p className="text-sm text-stone-600 mt-1">{note}</p>}
      <div className={title ? "mt-4" : ""}>{children}</div>
    </section>
  )
}

export function Kpi({
  label,
  value,
  change,
}: {
  label: string
  value: string
  change?: number | null
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 border-s-4 border-s-wine p-3.5 sm:p-4">
      <p className="text-sm font-semibold text-stone-600">{label}</p>
      <p className="mt-1 text-xl sm:text-2xl font-extrabold text-stone-900 leading-tight">
        <bdi>{value}</bdi>
      </p>
      {change !== null && change !== undefined && (
        <p className={`mt-1 text-sm font-bold ${change >= 0 ? "text-emerald-700" : "text-red-700"}`}>
          <bdi>{formatSignedPercent(change)}</bdi> <span className="font-medium">לעומת החודש הקודם</span>
        </p>
      )}
    </div>
  )
}

export function TypeShares({ rows }: { rows: TypeRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.revenueAgorot, 0)
  const slices: PieSlice[] = rows.map((row) => ({
    key: row.key,
    label: row.label,
    value: row.revenueAgorot,
    color: TYPE_COLORS[row.key],
    valueText: shareText(formatShekels(row.revenueAgorot), row.sharePercent),
    detail: `${formatCount(row.bottles)} בקבוקים`,
  }))
  return <SalesPie slices={slices} centerLabel="הכנסות" centerValue={formatShekels(total)} ariaLabel="חלוקת ההכנסות לפרטי וסיטונאי" />
}

function splitText(byType: TypeSplit): string {
  return TYPE_KEYS.filter((key) => byType[key].revenueAgorot > 0)
    .map((key) => `${TYPE_LABELS[key]} ${formatShekels(byType[key].revenueAgorot)}`)
    .join(" · ")
}

export function WineShares({ rows, totalAgorot }: { rows: WineRow[]; totalAgorot: number }) {
  const slices: PieSlice[] = rows.map((row, index) => ({
    key: row.label,
    label: row.label,
    value: row.revenueAgorot,
    color: index < COLORED_ROWS ? CATEGORY_COLORS[index] : REST_COLOR,
    valueText: shareText(formatShekels(row.revenueAgorot), row.sharePercent),
    detail: [`${formatCount(row.bottles)} בקבוקים`, splitText(row.byType)].filter(Boolean).join(" · "),
    inChart: index < COLORED_ROWS,
  }))

  // Wines beyond the colored ones are drawn together as one grey slice, so the pie stays readable.
  const rest = rows.slice(COLORED_ROWS)
  if (rest.length > 0) {
    slices.push({
      key: "rest",
      label: "שאר היינות",
      value: rest.reduce((sum, row) => sum + row.revenueAgorot, 0),
      color: REST_COLOR,
      valueText: "",
      inLegend: false,
    })
  }
  return <SalesPie slices={slices} centerLabel="הכנסות" centerValue={formatShekels(totalAgorot)} ariaLabel="חלוקת ההכנסות לפי יין" />
}

// With `withRest` the chart ends in a grey slice for every other customer. Without it the chart holds only
// the listed customers, and the percentages are shares of that group.
export function CustomerShares({
  rows,
  totalAgorot,
  withRest = true,
}: {
  rows: CustomerRow[]
  totalAgorot: number
  withRest?: boolean
}) {
  const named = rows.reduce((sum, row) => sum + row.revenueAgorot, 0)
  const slices: PieSlice[] = rows.map((row, index) => ({
    key: row.name,
    label: row.name,
    value: row.revenueAgorot,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    valueText: shareText(formatShekels(row.revenueAgorot), withRest ? row.sharePercent : (row.revenueAgorot / named) * 100),
    detail: `${formatCount(row.bottles)} בקבוקים`,
  }))
  if (!withRest) {
    return (
      <SalesPie
        slices={slices}
        centerLabel={`${rows.length} הגדולים`}
        centerValue={formatShekels(named)}
        ariaLabel="חלוקת ההכנסות בין הלקוחות הגדולים"
      />
    )
  }
  if (totalAgorot - named > 0) {
    slices.push({
      key: "rest",
      label: "שאר הלקוחות",
      value: totalAgorot - named,
      color: REST_COLOR,
      valueText: shareText(formatShekels(totalAgorot - named), 100 - rows.reduce((sum, row) => sum + row.sharePercent, 0)),
    })
  }
  return <SalesPie slices={slices} centerLabel="הכנסות" centerValue={formatShekels(totalAgorot)} ariaLabel="חלוקת ההכנסות בין הלקוחות הגדולים לשאר" />
}

export function Insights({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <Card title="תובנות">
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-base font-medium text-stone-800">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-wine" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function TypeLegend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm font-semibold text-stone-700">
      {TYPE_KEYS.map((key) => (
        <li key={key} className="inline-flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: TYPE_COLORS[key] }} aria-hidden="true" />
          {TYPE_LABELS[key]}
        </li>
      ))}
    </ul>
  )
}

export const WINE_NOTE = "הכנסה לכל יין היא הערכה: ההכנסה של כל מכירה מחולקת בין היינות שבה לפי מספר הבקבוקים"
