"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MAX_INSTALLMENTS, isMonthKey } from "@/lib/grower-payments"
import { savePaymentPlan } from "@/server/actions/grower-payment-actions"

// The month of a grower's first payment and the number of monthly payments. Saving builds the schedule;
// payments already marked as paid are kept, and what is still owed is divided between the open ones.
export function PlanForm({
  vintageId,
  growerId,
  plan,
  outOfDate,
}: {
  vintageId: string
  growerId: string
  plan: { firstMonth: string; count: number } | null
  outOfDate: boolean
}) {
  const router = useRouter()
  const [firstMonth, setFirstMonth] = useState(plan?.firstMonth ?? "")
  const [count, setCount] = useState(plan ? String(plan.count) : "")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    if (!isMonthKey(firstMonth)) return setError("יש לבחור חודש תשלום ראשון")
    const parsedCount = Number(count)
    if (!Number.isInteger(parsedCount)) return setError("מספר התשלומים חייב להיות מספר שלם")

    setBusy(true)
    const result = await savePaymentPlan({ vintageId, growerId, firstMonth, count: parsedCount })
    setBusy(false)
    if (result.success) router.refresh()
    else setError(result.error.message)
  }

  const unchanged = plan !== null && plan.firstMonth === firstMonth && String(plan.count) === count && !outOfDate

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="block text-sm font-semibold text-stone-700 mb-1">חודש תשלום ראשון</span>
          <input
            type="month"
            dir="ltr"
            value={firstMonth}
            onChange={(event) => setFirstMonth(event.target.value)}
            placeholder="2026-12"
            className="border border-stone-300 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-semibold text-stone-700 mb-1">מספר תשלומים</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max={MAX_INSTALLMENTS}
            dir="ltr"
            value={count}
            onChange={(event) => setCount(event.target.value)}
            className="w-28 border border-stone-300 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={busy || unchanged}
          className="bg-wine text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-wine-dark transition-colors disabled:opacity-40"
        >
          {plan ? (outOfDate ? "חישוב מחדש" : "עדכון לוח") : "יצירת לוח תשלומים"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-red-600 text-sm">
          {error}
        </p>
      )}
    </form>
  )
}
