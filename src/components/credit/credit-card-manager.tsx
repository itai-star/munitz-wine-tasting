"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  createCreditCard,
  deleteCreditCard,
  updateCreditCard,
} from "@/server/actions/credit-actions"
import type { CreditCardInfo } from "@/server/credit-data"

const inputClass =
  "w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
const labelClass = "block text-xs text-stone-500 mb-1"

function CardRow({ card }: { card: CreditCardInfo }) {
  const router = useRouter()
  const [name, setName] = useState(card.name)
  const [last4, setLast4] = useState(card.last4 ?? "")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleSave() {
    setBusy(true)
    setMessage(null)
    const result = await updateCreditCard({ id: card.id, name, last4: last4.trim() || null })
    setBusy(false)
    if (result.success) {
      setMessage({ type: "success", text: "נשמר" })
      router.refresh()
    } else {
      setMessage({ type: "error", text: result.error.message })
    }
  }

  async function handleDelete() {
    if (!confirm(`למחוק את הכרטיס "${card.name}" ואת כל העסקאות שנשמרו עבורו?`)) return
    setBusy(true)
    const result = await deleteCreditCard(card.id)
    setBusy(false)
    if (result.success) router.refresh()
    else setMessage({ type: "error", text: result.error.message })
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_9rem_auto] items-end py-3 border-b border-stone-100 last:border-0">
      <div>
        <label className={labelClass}>שם הכרטיס</label>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>4 ספרות אחרונות</label>
        <input
          className={inputClass}
          dir="ltr"
          inputMode="numeric"
          maxLength={4}
          value={last4}
          onChange={(e) => setLast4(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="bg-wine text-white px-5 py-2 rounded-lg text-sm hover:bg-wine-dark transition-colors disabled:opacity-50"
        >
          שמור
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="text-sm text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          מחק
        </button>
        {message && (
          <span className={`text-xs ${message.type === "success" ? "text-green-700" : "text-red-600"}`}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  )
}

function AddCardForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [last4, setLast4] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleAdd() {
    setSaving(true)
    setError("")
    const result = await createCreditCard({ name, last4: last4.trim() || null })
    setSaving(false)
    if (result.success) {
      setName("")
      setLast4("")
      router.refresh()
    } else {
      setError(result.error.message)
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_9rem_auto] items-end border border-dashed border-stone-300 rounded-lg p-4">
      <div>
        <label className={labelClass}>הוספת כרטיס: שם</label>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>4 ספרות אחרונות</label>
        <input
          className={inputClass}
          dir="ltr"
          inputMode="numeric"
          maxLength={4}
          value={last4}
          onChange={(e) => setLast4(e.target.value)}
        />
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={saving}
        className="bg-wine text-white px-6 py-2 rounded-lg text-sm hover:bg-wine-dark transition-colors disabled:opacity-50"
      >
        {saving ? "מוסיף..." : "הוסף כרטיס"}
      </button>
      {error && <p className="sm:col-span-3 text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{error}</p>}
    </div>
  )
}

export function CreditCardManager({ cards }: { cards: CreditCardInfo[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 space-y-4">
      <div>
        {cards.map((card) => (
          <CardRow key={card.id} card={card} />
        ))}
      </div>
      <AddCardForm />
    </div>
  )
}
