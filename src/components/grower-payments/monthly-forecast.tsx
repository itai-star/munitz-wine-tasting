import { formatShekels } from "@/lib/credit"
import { Card, PaidBar } from "@/components/grower-payments/payment-parts"
import { PaidToggle } from "@/components/grower-payments/paid-toggle"
import type { MonthPayment } from "@/server/grower-payments-data"

export function MonthlyForecast({ months }: { months: MonthPayment[] }) {
  if (months.length === 0) {
    return (
      <Card title="צפי תשלומים חודשי">
        <p className="text-base text-stone-500">עדיין לא הוגדר לוח תשלומים לאף כורם. בכל כורם בוחרים חודש ראשון ומספר תשלומים.</p>
      </Card>
    )
  }

  const largest = Math.max(...months.map((month) => month.expectedAgorot), 1)

  return (
    <Card title="צפי תשלומים חודשי" note="כמה צפוי לצאת בכל חודש, וכמה מזה כבר שולם">
      <ul className="space-y-5">
        {months.map((month) => (
          <li key={month.month}>
            <details>
              <summary className="cursor-pointer list-none">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-lg font-extrabold text-stone-900">{month.label}</span>
                  <span className="text-lg font-extrabold text-stone-900">
                    <bdi>{formatShekels(month.expectedAgorot)}</bdi>
                  </span>
                </div>
                <span className="mt-1.5 block h-2 rounded bg-stone-100 overflow-hidden" aria-hidden="true">
                  <span className="block h-full rounded bg-wine/70" style={{ width: `${(month.expectedAgorot / largest) * 100}%` }} />
                </span>
                <div className="mt-2">
                  <PaidBar paidAgorot={month.paidAgorot} openAgorot={month.openAgorot} paidPercent={month.paidPercent} />
                </div>
              </summary>
              <ul className="mt-3 divide-y divide-stone-100 border-t border-stone-100">
                {month.items.map((item) => (
                  <li key={item.installmentId} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-base font-bold text-stone-900">{item.growerName}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-base font-extrabold text-stone-900">
                        <bdi>{formatShekels(item.amountAgorot)}</bdi>
                      </span>
                      <PaidToggle installmentId={item.installmentId} paid={item.paid} />
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </Card>
  )
}
