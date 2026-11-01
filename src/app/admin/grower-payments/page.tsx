import { formatShekels } from "@/lib/credit"
import { formatCount } from "@/lib/sales-summary"
import { GrowerPaymentCard } from "@/components/grower-payments/grower-payment-card"
import { MonthlyForecast } from "@/components/grower-payments/monthly-forecast"
import { Card, PaidBar, Stat } from "@/components/grower-payments/payment-parts"
import { PaymentsExcelPanel } from "@/components/grower-payments/payments-excel-panel"
import { loadPaymentsOverview } from "@/server/grower-payments-data"

export const dynamic = "force-dynamic"

export default async function GrowerPaymentsPage({ searchParams }: { searchParams: Promise<{ vintage?: string }> }) {
  const { vintage: vintageParam } = await searchParams
  const overview = await loadPaymentsOverview(vintageParam)
  const { vintage, totals, unassigned } = overview

  if (!vintage) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-extrabold text-stone-900">תשלומי כורמים</h1>
        <p className="text-stone-500">יש ליצור בציר ולרשום קליטות לפני חישוב תשלומים.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-stone-900">תשלומי כורמים</h1>
        <p className="text-base text-stone-600 mt-1">
          {vintage.label}: הסכום לכל כורם הוא הקליטות של הבלוקים שלו כפול המחיר לקילו. הבציר נבחר בראש המסך.
        </p>
      </div>

      <PaymentsExcelPanel vintageId={vintage.id} year={vintage.year} />

      {overview.growers.length === 0 ? (
        <Card>
          <p className="text-base text-stone-600">
            אין עדיין קליטות של בלוקים משויכים לכורם בבציר הזה. משייכים בלוקים לכורמים במסך &quot;כורמים&quot;.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="סה״כ לתשלום" value={formatShekels(totals.amountAgorot)} />
            <Stat label="שולם" value={formatShekels(totals.paidAgorot)} tone="paid" />
            <Stat label="פתוח" value={formatShekels(totals.openAgorot)} tone="open" />
            <Stat label="כמות ענבים" value={`${formatCount(Math.round(totals.kg))} ק״ג`} />
          </div>

          <Card title="התקדמות התשלום">
            <PaidBar paidAgorot={totals.paidAgorot} openAgorot={totals.openAgorot} paidPercent={totals.paidPercent} />
            {totals.unscheduledAgorot > 0 && (
              <p className="mt-3 text-sm font-semibold text-amber-900 bg-amber-50 rounded-lg px-3 py-2">
                <bdi>{formatShekels(totals.unscheduledAgorot)}</bdi> עדיין בלי לוח תשלומים, ולכן לא נכללים בצפי החודשי ובאחוזים.
              </p>
            )}
          </Card>

          <MonthlyForecast months={overview.months} />

          <section className="space-y-3" aria-label="הכורמים">
            <h2 className="text-xl font-extrabold text-stone-900">לפי כורם</h2>
            {overview.growers.map((grower) => (
              <GrowerPaymentCard key={grower.id} grower={grower} vintageId={vintage.id} />
            ))}
          </section>
        </>
      )}

      {unassigned.blocks.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-2" aria-label="קליטות בלי כורם">
          <h2 className="text-lg font-extrabold text-amber-900">
            קליטות של בלוקים בלי כורם ({formatCount(Math.round(unassigned.kg))} ק״ג)
          </h2>
          <p className="text-sm text-amber-900/80">הקליטות האלה לא נכללות בתשלומים. משייכים כורם לבלוקים בטאב &quot;נתונים כספיים&quot;.</p>
          <ul className="divide-y divide-amber-200">
            {unassigned.blocks.map((block) => (
              <li key={block.name} className="flex justify-between gap-3 py-2 text-base">
                <span className="font-bold text-stone-900">
                  {block.name} <span className="font-medium text-stone-600">· {block.variety}</span>
                </span>
                <span className="font-semibold text-stone-800">
                  <bdi>{formatCount(Math.round(block.kg))}</bdi> ק״ג
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
