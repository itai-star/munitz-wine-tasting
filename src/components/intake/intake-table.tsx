"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteIntakes } from "@/server/actions/intake-actions"

export type IntakeRow = {
  id: string
  intakeDate: string | Date
  totalWeightKg: number
  binCount: number
  notes: string | null
  blockName: string
}

export function IntakeTable({ intakes }: { intakes: IntakeRow[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === intakes.length ? new Set() : new Set(intakes.map((i) => i.id))
    )
  }

  async function handleDelete() {
    if (selected.size === 0) return
    if (!confirm(`למחוק ${selected.size} קליטות שנבחרו?`)) return

    setDeleting(true)
    setError("")
    const result = await deleteIntakes(Array.from(selected))
    setDeleting(false)

    if (result.success) {
      setSelected(new Set())
      router.refresh()
    } else {
      setError(result.error.message)
    }
  }

  const totalWeight = intakes.reduce((sum, i) => sum + i.totalWeightKg, 0)
  const totalBins = intakes.reduce((sum, i) => sum + i.binCount, 0)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-x-auto">
      <div className="flex items-center justify-between gap-3 p-3 border-b border-stone-200 flex-wrap">
        <span className="text-sm text-stone-500">
          {selected.size > 0
            ? `${selected.size} נבחרו`
            : `${intakes.length} קליטות · סה״כ ${totalWeight.toLocaleString("he-IL")} ק״ג · ${totalBins.toLocaleString("he-IL")} משטחים`}
        </span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={selected.size === 0 || deleting}
          className="text-sm text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
        >
          {deleting ? "מוחק..." : "מחק נבחרים"}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm px-3 py-2">{error}</p>}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200 text-stone-500 text-right">
            <th className="px-4 py-2 font-medium w-8">
              <input
                type="checkbox"
                checked={intakes.length > 0 && selected.size === intakes.length}
                onChange={toggleAll}
                aria-label="בחר הכל"
                className="accent-wine w-4 h-4"
              />
            </th>
            <th className="px-4 py-2 font-medium">תאריך</th>
            <th className="px-4 py-2 font-medium">כרם</th>
            <th className="px-4 py-2 font-medium">משקל (ק&quot;ג)</th>
            <th className="px-4 py-2 font-medium">משטחים</th>
            <th className="px-4 py-2 font-medium">הערות</th>
          </tr>
        </thead>
        <tbody>
          {intakes.map((i) => (
            <tr key={i.id} className="border-b border-stone-100 last:border-0">
              <td className="px-4 py-2">
                <input
                  type="checkbox"
                  checked={selected.has(i.id)}
                  onChange={() => toggle(i.id)}
                  aria-label={`בחר קליטה מ-${new Date(i.intakeDate).toLocaleDateString("he-IL")}`}
                  className="accent-wine w-4 h-4"
                />
              </td>
              <td className="px-4 py-2">{new Date(i.intakeDate).toLocaleDateString("he-IL")}</td>
              <td className="px-4 py-2">{i.blockName}</td>
              <td className="px-4 py-2">{i.totalWeightKg.toLocaleString("he-IL")}</td>
              <td className="px-4 py-2">{i.binCount}</td>
              <td className="px-4 py-2 text-stone-500">{i.notes ?? "—"}</td>
            </tr>
          ))}
          {intakes.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-stone-400">
                אין עדיין קליטות ענבים לעונה זו
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
