"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { setInstallmentPaid } from "@/server/actions/grower-payment-actions"

export function PaidToggle({ installmentId, paid }: { installmentId: string; paid: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleClick() {
    setBusy(true)
    await setInstallmentPaid(installmentId, !paid)
    setBusy(false)
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={paid}
      className={`shrink-0 min-h-10 min-w-20 rounded-lg px-3 text-sm font-bold border transition-colors disabled:opacity-50 ${
        paid
          ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
          : "bg-white text-amber-800 border-amber-400 hover:bg-amber-50"
      }`}
    >
      {paid ? "שולם" : "פתוח"}
    </button>
  )
}
