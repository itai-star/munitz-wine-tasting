import Link from "next/link"
import { formatShekels } from "@/lib/credit"
import { formatCount, formatPercent, formatSignedPercent, monthsRangeText, percentOf } from "@/lib/sales-summary"
import type { Compared } from "@/lib/sales-summary"
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

function ChangeCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-stone-400">אין נתון</span>
  return <span className={`font-extrabold ${value >= 0 ? "text-emerald-700" : "text-red-700"}`}>{formatSignedPercent(value)}</span>
}

function ComparisonRow({ label, row, format }: { label: string; row: Compared; format: (value: number) => string }) {
  return (
    <tr className="border-t border-stone-200">
      <th scope="row" className="py-2 pe-3 text-start text-base font-bold text-stone-900">
        {label}
      </th>
      <td className="px-2 py-2 text-base font-extrabold text-stone-900">
        <bdi>{format(row.current)}</bdi>
      </td>
      <td className="px-2 py-2 text-base font-semibold text-stone-700">
        <bdi>{format(row.previous)}</bdi>
      </td>
      <td className="ps-2 py-2 text-base">
        <bdi>
          <ChangeCell value={row.changePercent} />
        </bdi>
      </td>
    </tr>
  )
}

export function SalesYearView({ summary }: { summary: YearSummary }) {
  const monthsWithData = summary.months.filter((row) => row.hasData)
  const largest = Math.max(...monthsWithData.map((row) => Math.max(row.revenueAgorot, row.lastYear?.revenueAgorot ?? 0)), 1)
  const comparison = summary.comparison
  const against = comparison ? (comparison.isPartial ? `אותם חודשים ב-${comparison.previousYear}` : String(comparison.previousYear)) : ""
  const yearChange = (value: number | null | undefined): { value: number | null | undefined; label: string }[] => [{ value, label: `לעומת ${against}` }]
  const topCustomersShare = percentOf(
    summary.topCustomers.reduce((sum, row) => sum + row.revenueAgorot, 0),
    summary.revenueAgorot
  )
  const topCustomersNote = `יחד הם ${formatPercent(topCustomersShare)} מהכנסות השנה. האחוזים בגרף הם מתוך הלקוחות האלה`

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Kpi label="בקבוקים שנמכרו" value={formatCount(summary.bottles)} changes={yearChange(comparison?.bottles.changePercent)} />
        <Kpi label="הכנסות (כולל מע״מ)" value={formatShekels(summary.revenueAgorot)} changes={yearChange(comparison?.revenueAgorot.changePercent)} />
        <Kpi label="הכנסות לפני מע״מ" value={formatShekels(summary.revenueNetAgorot)} changes={yearChange(comparison?.revenueNetAgorot.changePercent)} />
        <Kpi label="מחיר ממוצע לבקבוק (לפני מע״מ)" value={formatShekels(summary.avgPriceNetAgorot)} changes={yearChange(comparison?.avgPriceNetAgorot.changePercent)} />
        <Kpi label="ממוצע חודשי (לפני מע״מ)" value={formatShekels(summary.avgMonthlyNetAgorot)} />
        <Kpi label="חודשים עם נתונים" value={`${summary.monthsWithData} מתוך 12`} />
      </div>

      {comparison ? (
        <Card
          title={`השוואה לשנת ${comparison.previousYear}`}
          note={
            comparison.isPartial
              ? `ההשוואה היא על אותם חודשים בלבד, ${monthsRangeText(comparison.months)}, כדי שלא להשוות שנה חלקית לשנה שלמה.`
              : "השוואה של כל חודשי השנה."
          }
        >
          <table className="w-full">
            <thead>
              <tr className="text-sm font-bold text-stone-600">
                <th scope="col" className="pb-1 pe-3 text-start">
                  מדד
                </th>
                <th scope="col" className="px-2 pb-1 text-start">
                  {summary.year}
                </th>
                <th scope="col" className="px-2 pb-1 text-start">
                  {comparison.previousYear}
                </th>
                <th scope="col" className="ps-2 pb-1 text-start">
                  שינוי
                </th>
              </tr>
            </thead>
            <tbody>
              <ComparisonRow label="בקבוקים" row={comparison.bottles} format={formatCount} />
              <ComparisonRow label="הכנסות כולל מע״מ" row={comparison.revenueAgorot} format={formatShekels} />
              <ComparisonRow label="הכנסות לפני מע״מ" row={comparison.revenueNetAgorot} format={formatShekels} />
              <ComparisonRow label="מחיר ממוצע לבקבוק" row={comparison.avgPriceNetAgorot} format={formatShekels} />
            </tbody>
          </table>
        </Card>
      ) : (
        <p className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-base font-semibold text-stone-600">
          אין נתוני מכירות לשנת {summary.year - 1} להשוואה. אפשר לייבא אותם מהקובץ של אותה שנה.
        </p>
      )}

      <Card title="צבירה לפי חודש" note="הכנסות כולל מע״מ, מחולקות לפרטי וסיטונאי. הפס הצר מתחת הוא אותו חודש בשנה שעברה.">
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
              {row.lastYear && (
                <span className="mt-1 flex h-2 rounded-md bg-stone-100 overflow-hidden" role="img" aria-label={`${row.label} ${summary.year - 1}`}>
                  <span
                    className="h-full bg-stone-400"
                    style={{ width: `${(row.lastYear.revenueAgorot / largest) * 100}%` }}
                    title={`${summary.year - 1}: ${formatShekels(row.lastYear.revenueAgorot)}`}
                  />
                </span>
              )}
              <p className="mt-1.5 text-sm font-medium text-stone-600">
                <bdi>{formatCount(row.bottles)}</bdi> בקבוקים · מחיר ממוצע לפני מע״מ{" "}
                <bdi>{formatShekels(row.avgPriceNetAgorot)}</bdi> · מצטבר מתחילת השנה לפני מע״מ{" "}
                <bdi>{formatShekels(row.cumulativeNetAgorot)}</bdi>
                {row.lastYear && (
                  <>
                    {" "}
                    · ב-{summary.year - 1}: <bdi>{formatShekels(row.lastYear.revenueAgorot)}</bdi>
                    {row.changeYearPercent !== null && (
                      <>
                        {" "}
                        (<ChangeCell value={row.changeYearPercent} />)
                      </>
                    )}
                  </>
                )}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid xl:grid-cols-2 gap-4">
        <Card title="פרטי או סיטונאי (כל השנה)">
          <TypeShares rows={summary.types} />
        </Card>
        <Card title={`${summary.topCustomers.length} הלקוחות הגדולים בשנה`} note={topCustomersNote}>
          <CustomerShares rows={summary.topCustomers} totalAgorot={summary.revenueAgorot} withRest={false} />
        </Card>
      </div>

      <Card title="לפי יין (כל השנה)" note={WINE_NOTE}>
        <WineShares rows={summary.wines} totalAgorot={summary.revenueAgorot} />
      </Card>

      <Insights items={summary.insights} />
    </div>
  )
}
