"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { setVintagePrice } from "@/server/actions/grower-payment-actions"
import type { PriceSource } from "@/server/grower-payments-data"

const SOURCE_TEXT: Record<PriceSource, string> = {
  vintage: "מחיר לבציר הזה",
  default: "מחיר ברירת מחדל",
  missing: "אין מחיר",
}

// The price of one block for the chosen vintage. Saving a different price keeps it for this vintage only;
// clearing it goes back to the block's default price.
export function PriceEditor({
  vintageId,
  blockId,
  priceAgorot,
  source,
}: {
  vintageId: string
  blockId: string
  priceAgorot: number | null
  source: PriceSource
}) {
  const router = useRouter()
  const initial = priceAgorot === null ? "" : String(priceAgorot / 100)
  const [value, setValue] = useState(initial)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function save(next: string) {
    const trimmed = next.trim()
    const price = trimmed === "" ? null : Number(trimmed)
    if (price !== null && !Number.isFinite(price)) return setError("המחיר חייב להיות מספר")
    setBusy(true)
    setError("")
    const result = await setVintagePrice({ vintageId, blockId, pricePerKg: price })
    setBusy(false)
    if (result.success) router.refresh()
    else setError(result.error.message)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        dir="ltr"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label="מחיר לקילו"
        className="w-24 border border-stone-300 rounded-lg px-2 py-1.5 text-base focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
      />
      <button
        type="button"
        disabled={busy || value === initial}
        onClick={() => save(value)}
        className="border border-stone-300 rounded-lg px-3 min-h-9 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-40"
      >
        שמירה
      </button>
      {source === "vintage" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => save("")}
          className="text-sm text-wine underline disabled:opacity-40"
        >
          חזרה לברירת מחדל
        </button>
      )}
      <span className={`text-xs font-medium ${source === "missing" ? "text-red-600" : "text-stone-500"}`}>{SOURCE_TEXT[source]}</span>
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </div>
  )
}
