import { Card, Kpi } from "@/components/sales/sales-parts"
import type { YearSummary } from "@/lib/barrel-room"

function BreakdownCard({ title, note, rows }: { title: string; note?: string; rows: { key: string; label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => row.count))
  return (
    <Card title={title} note={note}>
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

export function BarrelsSummary({ summary, year }: { summary: YearSummary; year: number }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi label={`חביות בשנת ${year}`} value={String(summary.total)} />
        <Kpi label="עם יין" value={String(summary.withWine)} />
        <Kpi label="בלי יין" value={String(summary.withoutWine)} />
        <Kpi label="בדיקות מעבדה" value={String(summary.tests)} />
      </div>
      {summary.left > 0 && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900">
          {summary.left} מהחביות האלה הוצאו מהמלאי, בשנה הזו או אחריה. הן מופיעות כאן כי היו בשימוש בשנה הזו.
        </p>
      )}
      {summary.byVariety.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <BreakdownCard
            title="חביות לפי זן"
            note="חבית של שילוב נספרת לכל זן לפי האחוז שלו."
            rows={summary.byVariety.map((row) => ({ key: row.variety, label: row.variety, count: row.count }))}
          />
          <BreakdownCard title="חביות לפי סוג" rows={summary.byType.map((row) => ({ key: row.type, label: row.type, count: row.count }))} />
        </div>
      )}
    </div>
  )
}
