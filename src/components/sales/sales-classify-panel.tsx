"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatShekels } from "@/lib/credit"
import { formatCount } from "@/lib/sales-summary"
import { classifySalesCustomer } from "@/server/actions/sales-actions"
import type { UnclassifiedCustomer } from "@/server/sales-data"

const VISIBLE_AT_FIRST = 12

export function SalesClassifyPanel({ customers }: { customers: UnclassifiedCustomer[] }) {
  const router = useRouter()
  const [busyName, setBusyName] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [showAll, setShowAll] = useState(false)

  if (customers.length === 0) return null
  const visible = showAll ? customers : customers.slice(0, VISIBLE_AT_FIRST)

  async function classify(name: string, type: "PRIVATE" | "WHOLESALE") {
    setBusyName(name)
    setError("")
    const result = await classifySalesCustomer(name, type)
    setBusyName(null)
    if (result.success) router.refresh()
    else setError(result.error.message)
  }

  return (
    <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5 space-y-3" aria-label="לקוחות ללא סיווג">
      <h2 className="font-semibold text-amber-900">לקוחות שלא סווגו ({customers.length})</h2>
      <p className="text-sm text-amber-900/80">
        בגיליונות של חלק מהחודשים אין עמודת סוג לקוח. אפשר לסווג כאן כל לקוח פעם אחת, והסיווג יחול על כל החודשים וייזכר בייבוא הבא.
      </p>
      {error && (
        <p role="alert" className="text-red-600 text-sm">
          {error}
        </p>
      )}
      <ul className="divide-y divide-amber-200">
        {visible.map((customer) => (
          <li key={customer.name} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
            <span className="text-stone-800 min-w-0 break-words">{customer.name}</span>
            <span className="text-xs text-stone-500">
              <bdi>{formatCount(customer.bottles)}</bdi> בקבוקים · <bdi>{formatShekels(customer.revenueAgorot)}</bdi>
            </span>
            <span className="ms-auto flex gap-2">
              {(["PRIVATE", "WHOLESALE"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => classify(customer.name, type)}
                  disabled={busyName === customer.name}
                  className="border border-amber-300 bg-white rounded-lg px-3 min-h-10 text-sm text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                >
                  {type === "PRIVATE" ? "פרטי" : "סיטונאי"}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
      {customers.length > VISIBLE_AT_FIRST && !showAll && (
        <button type="button" onClick={() => setShowAll(true)} className="text-sm text-amber-900 underline">
          הצגת כל {customers.length} הלקוחות
        </button>
      )}
    </section>
  )
}
