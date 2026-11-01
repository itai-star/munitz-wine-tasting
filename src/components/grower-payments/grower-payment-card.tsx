import { formatShekels } from "@/lib/credit"
import { formatMonthKey } from "@/lib/grower-payments"
import { formatCount } from "@/lib/sales-summary"
import { PaidBar } from "@/components/grower-payments/payment-parts"
import { PaidToggle } from "@/components/grower-payments/paid-toggle"
import { PlanForm } from "@/components/grower-payments/plan-form"
import { PriceEditor } from "@/components/grower-payments/price-editor"
import type { GrowerPayment } from "@/server/grower-payments-data"

export function GrowerPaymentCard({ grower, vintageId }: { grower: GrowerPayment; vintageId: string }) {
  const missingPrices = grower.lines.filter((line) => line.priceSource === "missing" && line.kg > 0)

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5 sm:p-6 space-y-5">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-xl font-extrabold text-stone-900">{grower.name}</h3>
        <p className="text-base font-bold text-stone-700">
          <bdi>{formatCount(Math.round(grower.kg))}</bdi> ק״ג ·{" "}
          <span className="text-xl font-extrabold text-stone-900">
            <bdi>{formatShekels(grower.amountAgorot)}</bdi>
          </span>
        </p>
      </header>

      {missingPrices.length > 0 && (
        <p role="alert" className="text-sm font-semibold text-red-700 bg-red-50 rounded-lg px-3 py-2">
          חסר מחיר לקילו ב-{missingPrices.map((line) => line.blockName).join(", ")}. עד שיוגדר, הבלוקים האלה לא נכללים בסכום.
        </p>
      )}

      {grower.plan && <PaidBar paidAgorot={grower.paidAgorot} openAgorot={grower.openAgorot} paidPercent={grower.paidPercent} />}

      <div>
        <h4 className="text-base font-extrabold text-stone-900 mb-2">לפי זן</h4>
        <ul className="divide-y divide-stone-100">
          {grower.varieties.map((variety) => (
            <li key={variety.variety} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2">
              <span className="text-base font-bold text-stone-900">{variety.variety}</span>
              <span className="text-base text-stone-700">
                <bdi>{formatCount(Math.round(variety.kg))}</bdi> ק״ג · <bdi>{formatShekels(variety.avgPriceAgorot)}</bdi> לק״ג ·{" "}
                <b className="font-extrabold text-stone-900">
                  <bdi>{formatShekels(variety.amountAgorot)}</bdi>
                </b>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <details>
        <summary className="cursor-pointer text-base font-bold text-wine">מחיר לכל בלוק בבציר הזה</summary>
        <ul className="mt-2 divide-y divide-stone-100">
          {grower.lines.map((line) => (
            <li key={line.blockId} className="py-2.5 space-y-1.5">
              <p className="text-base font-bold text-stone-900">
                {line.blockName} <span className="font-medium text-stone-600">· {line.variety} · </span>
                <span className="font-medium text-stone-700">
                  <bdi>{formatCount(Math.round(line.kg))}</bdi> ק״ג
                </span>
              </p>
              <PriceEditor vintageId={vintageId} blockId={line.blockId} priceAgorot={line.priceAgorot} source={line.priceSource} />
            </li>
          ))}
        </ul>
      </details>

      <div className="space-y-3 border-t border-stone-100 pt-4">
        <h4 className="text-base font-extrabold text-stone-900">לוח תשלומים</h4>
        {grower.scheduleOutOfDate && grower.plan && (
          <p role="status" className="text-sm font-semibold text-amber-900 bg-amber-50 rounded-lg px-3 py-2">
            סכום הלוח שונה מהסכום הנוכחי לתשלום, למשל בגלל קליטה חדשה או שינוי מחיר. אפשר ללחוץ &quot;חישוב מחדש&quot;. תשלומים ששולמו לא ישתנו.
          </p>
        )}
        <PlanForm vintageId={vintageId} growerId={grower.id} plan={grower.plan} outOfDate={grower.scheduleOutOfDate} />

        {grower.installments.length > 0 && (
          <ul className="divide-y divide-stone-100">
            {grower.installments.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-base font-bold text-stone-900">
                  {formatMonthKey(row.dueMonth)} <span className="font-medium text-stone-500">· תשלום {row.sequence}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-base font-extrabold text-stone-900">
                    <bdi>{formatShekels(row.amountAgorot)}</bdi>
                  </span>
                  <PaidToggle installmentId={row.id} paid={row.paid} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}
