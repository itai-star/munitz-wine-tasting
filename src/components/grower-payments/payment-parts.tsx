import { formatShekels } from "@/lib/credit"
import { formatPercent } from "@/lib/sales-summary"

export function Card({ title, note, children }: { title?: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5 sm:p-6">
      {title && <h2 className="text-lg sm:text-xl font-extrabold text-stone-900">{title}</h2>}
      {note && <p className="text-sm text-stone-600 mt-1">{note}</p>}
      <div className={title ? "mt-4" : ""}>{children}</div>
    </section>
  )
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: "paid" | "open" }) {
  const color = tone === "paid" ? "text-emerald-700" : tone === "open" ? "text-amber-700" : "text-stone-900"
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 border-s-4 border-s-wine p-3.5 sm:p-4">
      <p className="text-sm font-semibold text-stone-600">{label}</p>
      <p className={`mt-1 text-xl sm:text-2xl font-extrabold leading-tight ${color}`}>
        <bdi>{value}</bdi>
      </p>
    </div>
  )
}

// What share of an amount is paid: the green part is paid, the rest is still open.
export function PaidBar({ paidAgorot, openAgorot, paidPercent }: { paidAgorot: number; openAgorot: number; paidPercent: number }) {
  return (
    <div>
      <span className="flex h-3.5 rounded-md bg-amber-100 overflow-hidden" role="img" aria-label={`שולם ${formatPercent(paidPercent)}`}>
        <span className="h-full bg-emerald-600" style={{ width: `${Math.min(paidPercent, 100)}%` }} />
      </span>
      <p className="mt-1.5 flex flex-wrap justify-between gap-x-4 text-sm font-semibold">
        <span className="text-emerald-700">
          שולם <bdi>{formatShekels(paidAgorot)}</bdi> · <bdi>{formatPercent(paidPercent)}</bdi>
        </span>
        <span className="text-amber-700">
          פתוח <bdi>{formatShekels(openAgorot)}</bdi> · <bdi>{formatPercent(100 - paidPercent)}</bdi>
        </span>
      </p>
    </div>
  )
}
