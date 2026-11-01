"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteSalesMonth } from "@/server/actions/sales-actions"

export function SalesDeleteMonthButton({ year, month, label }: { year: number; month: number; label: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function handleClick() {
    if (!window.confirm(`למחוק את נתוני ${label} ${year} מהאפליקציה? אפשר לייבא אותם שוב מהקובץ.`)) return
    setBusy(true)
    setError("")
    const result = await deleteSalesMonth(year, month)
    setBusy(false)
    if (result.success) router.refresh()
    else setError(result.error.message)
  }

  return (
    <div className="text-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="border border-red-200 text-red-700 rounded-lg px-3 min-h-10 text-sm hover:bg-red-50 disabled:opacity-50"
      >
        {busy ? "מוחק..." : `מחיקת ${label}`}
      </button>
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  )
}
