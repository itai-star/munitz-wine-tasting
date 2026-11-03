import { Card, Kpi } from "@/components/sales/sales-parts"
import type { RoomSummary } from "@/lib/barrel-room"

function BreakdownCard({ title, rows }: { title: string; rows: { key: string; label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.count))
  return (
    <Card title={title}>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-base font-bold text-stone-900 min-w-0 break-words">{row.label}</span>
              <span className="text-base font-extrabold text-stone-900 whitespace-nowrap">
                <bdi>{row.count}</bdi>
              </span>
            </div>
            <div className="mt-1 h-3 rounded-full bg-stone-100 overflow-hidden" aria-hidden="true">
              <div className="h-full rounded-full bg-wine" style={{ width: `${Math.max((row.count / max) * 100, 3)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function BarrelsSummary({ summary }: { summary: RoomSummary }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Kpi label="חביות בחדר" value={String(summary.active)} />
        <Kpi label="הוצאו מהמלאי" value={String(summary.removed)} />
      </div>
      {summary.active > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <BreakdownCard title="חביות לפי סוג" rows={summary.byType.map((row) => ({ key: row.type, label: row.type, count: row.count }))} />
          <BreakdownCard title="חביות לפי שנה" rows={summary.byYear.map((row) => ({ key: String(row.year), label: String(row.year), count: row.count }))} />
        </div>
      )}
    </div>
  )
}
