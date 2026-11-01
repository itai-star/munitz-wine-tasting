import Link from "next/link"
import { formatShekels } from "@/lib/credit"
import { formatCount } from "@/lib/sales-summary"
import {
  Card,
  CustomerShares,
  Insights,
  Kpi,
  TYPE_COLORS,
  TypeLegend,
  TypeShares,
  WINE_NOTE,
  WineShares,
} from "@/components/sales/sales-parts"
import { TYPE_KEYS, TYPE_LABELS } from "@/server/sales-data"
import type { YearSummary } from "@/server/sales-data"

export function SalesYearView({ summary }: { summary: YearSummary }) {
  const monthsWithData = summary.months.filter((row) => row.hasData)
  const largest = Math.max(...monthsWithData.map((row) => row.revenueAgorot), 1)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Kpi label="בקבוקים שנמכרו" value={formatCount(summary.bottles)} />
        <Kpi label="הכנסות (כולל מע״מ)" value={formatShekels(summary.revenueAgorot)} />
        <Kpi label="הכנסות לפני מע״מ" value={formatShekels(summary.revenueNetAgorot)} />
        <Kpi label="מחיר ממוצע לבקבוק (לפני מע״מ)" value={formatShekels(summary.avgPriceNetAgorot)} />
        <Kpi label="ממוצע חודשי (לפני מע״מ)" value={formatShekels(summary.avgMonthlyNetAgorot)} />
        <Kpi label="חודשים עם נתונים" value={`${summary.monthsWithData} מתוך 12`} />
      </div>

      <Card title="צבירה לפי חודש" note="הכנסות כולל מע״מ, מחולקות לפרטי וסיטונאי">
        <div className="mb-3">
          <TypeLegend />
        </div>
        <ul className="space-y-3">
          {monthsWithData.map((row) => (
            <li key={row.month}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <Link
                  href={`/admin/monthly-summary?year=${summary.year}&month=${row.month}`}
                  className="text-base font-bold text-stone-900 hover:text-wine hover:underline"
                >
                  {row.label}
                </Link>
                <span className="text-base font-extrabold text-stone-900">
                  <bdi>{formatShekels(row.revenueAgorot)}</bdi>
                </span>
              </div>
              <span className="mt-1.5 flex h-4 rounded-md bg-stone-100 overflow-hidden" role="img" aria-label={row.label}>
                {TYPE_KEYS.map((key) =>
                  row.byType[key].revenueAgorot > 0 ? (
                    <span
                      key={key}
                      className="h-full border-s border-white first:border-s-0"
                      style={{
                        width: `${(row.byType[key].revenueAgorot / largest) * 100}%`,
                        backgroundColor: TYPE_COLORS[key],
                      }}
                      title={`${TYPE_LABELS[key]}: ${formatShekels(row.byType[key].revenueAgorot)}`}
                    />
                  ) : null
                )}
              </span>
              <p className="mt-1.5 text-sm font-medium text-stone-600">
                <bdi>{formatCount(row.bottles)}</bdi> בקבוקים · מחיר ממוצע לפני מע״מ{" "}
                <bdi>{formatShekels(row.avgPriceNetAgorot)}</bdi> · מצטבר מתחילת השנה לפני מע״מ{" "}
                <bdi>{formatShekels(row.cumulativeNetAgorot)}</bdi>
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid xl:grid-cols-2 gap-4">
        <Card title="פרטי או סיטונאי (כל השנה)">
          <TypeShares rows={summary.types} />
        </Card>
        <Card title="הלקוחות הגדולים בשנה">
          <CustomerShares rows={summary.topCustomers} totalAgorot={summary.revenueAgorot} />
        </Card>
      </div>

      <Card title="לפי יין (כל השנה)" note={WINE_NOTE}>
        <WineShares rows={summary.wines} totalAgorot={summary.revenueAgorot} />
      </Card>

      <Insights items={summary.insights} />
    </div>
  )
}
