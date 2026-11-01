import { formatShekels } from "@/lib/credit"
import { formatCount } from "@/lib/sales-summary"
import {
  Card,
  CustomerShares,
  Insights,
  Kpi,
  TypeShares,
  WINE_NOTE,
  WineShares,
} from "@/components/sales/sales-parts"
import { SalesDeleteMonthButton } from "@/components/sales/sales-delete-month-button"
import type { MonthSummary } from "@/server/sales-data"

export function SalesMonthView({ summary }: { summary: MonthSummary }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Kpi label="בקבוקים שנמכרו" value={formatCount(summary.bottles)} change={summary.bottlesChangePercent} />
        <Kpi label="הכנסות (כולל מע״מ)" value={formatShekels(summary.revenueAgorot)} />
        <Kpi label="הכנסות לפני מע״מ" value={formatShekels(summary.revenueNetAgorot)} change={summary.revenueChangePercent} />
        <Kpi label="מחיר ממוצע לבקבוק (לפני מע״מ)" value={formatShekels(summary.avgPriceNetAgorot)} />
        <Kpi label="מספר מכירות" value={formatCount(summary.sales)} />
        <Kpi label="ממוצע למכירה (כולל מע״מ)" value={formatShekels(summary.avgSaleAgorot)} />
      </div>

      <div className="grid xl:grid-cols-2 gap-4">
        <Card title="פרטי או סיטונאי">
          <TypeShares rows={summary.types} />
        </Card>
        <Card title="הלקוחות הגדולים">
          <CustomerShares rows={summary.topCustomers} totalAgorot={summary.revenueAgorot} />
        </Card>
      </div>

      <Card title="לפי יין" note={WINE_NOTE}>
        <WineShares rows={summary.wines} totalAgorot={summary.revenueAgorot} />
      </Card>

      <Insights items={summary.insights} />

      <div className="flex justify-end">
        <SalesDeleteMonthButton year={summary.year} month={summary.month} label={summary.label} />
      </div>
    </div>
  )
}
