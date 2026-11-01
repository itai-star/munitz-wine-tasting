import { formatShekels } from "@/lib/credit"
import { formatCount, formatPercent, formatSignedPercent } from "@/lib/sales-summary"
import { TYPE_KEYS, TYPE_LABELS } from "@/server/sales-data"
import type { CustomerRow, TypeKey, TypeRow, TypeSplit, WineRow } from "@/server/sales-data"

export const TYPE_COLORS: Record<TypeKey, string> = {
  PRIVATE: "#722F37",
  WHOLESALE: "#0f766e",
  UNCLASSIFIED: "#a8a29e",
}

export function Card({ title, note, children }: { title?: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 sm:p-5">
      {title && <h3 className="font-semibold text-stone-800">{title}</h3>}
      {note && <p className="text-xs text-stone-500 mt-1">{note}</p>}
      <div className={title ? "mt-3" : ""}>{children}</div>
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
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-3.5">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-lg sm:text-xl font-bold text-stone-800">
        <bdi>{value}</bdi>
      </p>
      {change !== null && change !== undefined && (
        <p className={`mt-0.5 text-xs font-medium ${change >= 0 ? "text-emerald-700" : "text-red-700"}`}>
          <bdi>{formatSignedPercent(change)}</bdi> לעומת החודש הקודם
        </p>
      )}
    </div>
  )
}

function Bar({ percent, color = "#722F37" }: { percent: number; color?: string }) {
  return (
    <span className="mt-1 block h-2.5 rounded bg-stone-100 overflow-hidden" aria-hidden="true">
      <span
        className="block h-full rounded"
        style={{ width: `${Math.min(Math.max(percent, 1.5), 100)}%`, backgroundColor: color }}
      />
    </span>
  )
}

export function TypeShares({ rows }: { rows: TypeRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-stone-400">אין נתונים</p>

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-stone-700">{row.label}</span>
            <span className="text-stone-700 whitespace-nowrap">
              <bdi>{formatShekels(row.revenueAgorot)}</bdi> · <bdi>{formatPercent(row.sharePercent)}</bdi>
            </span>
          </div>
          <Bar percent={row.sharePercent} color={TYPE_COLORS[row.key]} />
          <p className="mt-1 text-xs text-stone-500">
            <bdi>{formatCount(row.bottles)}</bdi> בקבוקים
          </p>
        </li>
      ))}
    </ul>
  )
}

function splitText(byType: TypeSplit): string {
  return TYPE_KEYS.filter((key) => byType[key].revenueAgorot > 0)
    .map((key) => `${TYPE_LABELS[key]} ${formatShekels(byType[key].revenueAgorot)}`)
    .join(" · ")
}

export function WineShares({ rows }: { rows: WineRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-stone-400">אין נתוני יינות</p>

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-stone-700 break-words min-w-0">{row.label}</span>
            <span className="text-stone-700 whitespace-nowrap">
              <bdi>{formatShekels(row.revenueAgorot)}</bdi> · <bdi>{formatPercent(row.sharePercent)}</bdi>
            </span>
          </div>
          <Bar percent={row.sharePercent} />
          <p className="mt-1 text-xs text-stone-500">
            <bdi>{formatCount(row.bottles)}</bdi> בקבוקים
            {splitText(row.byType) && (
              <>
                {" · "}
                <bdi>{splitText(row.byType)}</bdi>
              </>
            )}
          </p>
        </li>
      ))}
    </ul>
  )
}

export function CustomerShares({ rows }: { rows: CustomerRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-stone-400">אין נתונים</p>

  return (
    <ul className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.name}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-stone-700 break-words min-w-0">{row.name}</span>
            <span className="text-stone-700 whitespace-nowrap">
              <bdi>{formatShekels(row.revenueAgorot)}</bdi> · <bdi>{formatPercent(row.sharePercent)}</bdi>
            </span>
          </div>
          <Bar percent={row.sharePercent} />
        </li>
      ))}
    </ul>
  )
}

export function Insights({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <Card title="תובנות">
      <ul className="list-disc ps-5 space-y-1.5 text-sm text-stone-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Card>
  )
}

export function TypeLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
      {TYPE_KEYS.map((key) => (
        <li key={key} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: TYPE_COLORS[key] }} aria-hidden="true" />
          {TYPE_LABELS[key]}
        </li>
      ))}
    </ul>
  )
}

export const WINE_NOTE = "הכנסה לכל יין היא הערכה: ההכנסה של כל מכירה מחולקת בין היינות שבה לפי מספר הבקבוקים"
