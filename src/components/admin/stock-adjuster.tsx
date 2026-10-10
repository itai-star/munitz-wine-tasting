"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { adjustWineStock } from "@/server/actions/inventory-actions"

type StockWine = { id: string; name: string; quantity: number }

type Mode = "add" | "set"

const inputClass =
  "w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"

export function StockAdjuster({ wines }: { wines: StockWine[] }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("add")
  const [wineId, setWineId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const wine = wines.find((w) => w.id === wineId) ?? null

  function switchMode(next: Mode) {
    setMode(next)
    setQuantity("")
    setMessage(null)
  }

  async function handleSubmit() {
    if (!wine) return
    const qty = parseInt(quantity)
    if (Number.isNaN(qty)) {
      setMessage({ type: "error", text: "יש להזין כמות תקינה" })
      return
    }

    setSubmitting(true)
    setMessage(null)
    const result = await adjustWineStock({ wineId: wine.id, mode, quantity: qty })
    setSubmitting(false)

    if (result.success) {
      setMessage({
        type: "success",
        text: `המלאי של "${result.data.wineName}" עודכן — ${result.data.newQuantity} בקבוקים במלאי`,
      })
      setQuantity("")
      router.refresh()
    } else {
      setMessage({ type: "error", text: result.error.message })
    }
  }

  const tabClass = (active: boolean) =>
    `text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
      active ? "bg-wine text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
    }`

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
      <h3 className="font-semibold text-stone-800 mb-4">עדכון מלאי</h3>

      <div className="flex gap-2 mb-4">
        <button type="button" onClick={() => switchMode("add")} className={tabClass(mode === "add")}>
          הוספת בקבוקים
        </button>
        <button type="button" onClick={() => switchMode("set")} className={tabClass(mode === "set")}>
          קביעת כמות מדויקת
        </button>
      </div>

      {message && (
        <p
          className={`text-sm mb-4 px-3 py-2 rounded ${
            message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">יין</label>
          <select value={wineId} onChange={(e) => setWineId(e.target.value)} className={inputClass}>
            <option value="">בחר יין</option>
            {wines.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} — {w.quantity} במלאי
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            {mode === "add" ? "כמות להוספה" : "כמות חדשה במלאי"}
          </label>
          <input
            type="number"
            step="1"
            min={mode === "add" ? 1 : 0}
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={`${inputClass} sm:w-32`}
          />
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!wine || quantity === "" || submitting}
          className="bg-wine text-white px-6 py-2 rounded-lg hover:bg-wine-dark transition-colors text-sm font-medium disabled:opacity-50"
        >
          {submitting ? "מעדכן..." : mode === "add" ? "הוסף למלאי" : "עדכן מלאי"}
        </button>
      </div>

      {wine && mode === "add" && quantity !== "" && !Number.isNaN(parseInt(quantity)) && (
        <p className="text-xs text-stone-500 mt-3">
          המלאי יעלה מ-{wine.quantity} ל-{wine.quantity + parseInt(quantity)}
        </p>
      )}
    </div>
  )
}
