"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { inputClass, labelClass, primaryButtonClass } from "@/components/growers/grower-fields"
import { updateBlockFinance } from "@/server/actions/grower-actions"

type Props = {
  blockId: string
  growerId: string | null
  pricePerKg: number | null
  growers: { id: string; name: string }[]
}

// The grower is chosen from the list; the price is the default for the block and a vintage can override it.
export function BlockFinanceForm({ blockId, growerId, pricePerKg, growers }: Props) {
  const router = useRouter()
  const [selectedGrower, setSelectedGrower] = useState(growerId ?? "")
  const [price, setPrice] = useState(pricePerKg === null ? "" : String(pricePerKg))
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    setSaved(false)
    const trimmed = price.trim()
    const parsedPrice = trimmed === "" ? null : Number(trimmed)
    if (parsedPrice !== null && !Number.isFinite(parsedPrice)) {
      setError("המחיר חייב להיות מספר")
      return
    }

    setSubmitting(true)
    const result = await updateBlockFinance({ blockId, growerId: selectedGrower || null, pricePerKg: parsedPrice })
    setSubmitting(false)
    if (result.success) {
      setSaved(true)
      router.refresh()
    } else {
      setError(result.error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5 sm:p-6 space-y-4">
      <h2 className="text-lg sm:text-xl font-extrabold text-stone-900">נתונים כספיים</h2>
      {error && (
        <p role="alert" className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-emerald-700 text-sm bg-emerald-50 px-3 py-2 rounded">
          הנתונים נשמרו
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>כורם</label>
          <select className={inputClass} value={selectedGrower} onChange={(e) => setSelectedGrower(e.target.value)}>
            <option value="">ללא כורם</option>
            {growers.map((grower) => (
              <option key={grower.id} value={grower.id}>
                {grower.name}
              </option>
            ))}
          </select>
          {growers.length === 0 && (
            <p className="text-xs text-stone-500 mt-1">אין עדיין כורמים ברשימה. מוסיפים אותם במסך &quot;כורמים&quot;.</p>
          )}
        </div>
        <div>
          <label className={labelClass}>מחיר לקילו ענבים (₪, ללא מע״מ)</label>
          <input
            className={inputClass}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            dir="ltr"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <p className="text-xs text-stone-500 mt-1">מחיר ברירת המחדל לבלוק. אפשר להגדיר מחיר אחר לכל בציר בשלב התשלומים.</p>
        </div>
      </div>
      <button type="submit" disabled={submitting} className={primaryButtonClass}>
        {submitting ? "שומר..." : "שמירה"}
      </button>
    </form>
  )
}
