"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteSamples } from "@/server/actions/sample-actions"

export type SampleRow = {
  id: string
  sampleDate: string | Date
  brix: number | null
  ph: number | null
  titratableAcidity: number | null
  color: string | null
  blockName: string
}

export function SampleTable({ samples }: { samples: SampleRow[] }) {
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
      prev.size === samples.length ? new Set() : new Set(samples.map((s) => s.id))
    )
  }

  async function handleDelete() {
    if (selected.size === 0) return
    if (!confirm(`למחוק ${selected.size} דגימות שנבחרו?`)) return

    setDeleting(true)
    setError("")
    const result = await deleteSamples(Array.from(selected))
    setDeleting(false)

    if (result.success) {
      setSelected(new Set())
      router.refresh()
    } else {
      setError(result.error.message)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-x-auto">
      <div className="flex items-center justify-between gap-3 p-3 border-b border-stone-200">
        <span className="text-sm text-stone-500">
          {selected.size > 0 ? `${selected.size} נבחרו` : `${samples.length} דגימות`}
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
                checked={samples.length > 0 && selected.size === samples.length}
                onChange={toggleAll}
                aria-label="בחר הכל"
                className="accent-wine w-4 h-4"
              />
            </th>
            <th className="px-4 py-2 font-medium">תאריך</th>
            <th className="px-4 py-2 font-medium">כרם</th>
            <th className="px-4 py-2 font-medium">בומה</th>
            <th className="px-4 py-2 font-medium">PH</th>
            <th className="px-4 py-2 font-medium">חמיצות</th>
            <th className="px-4 py-2 font-medium">צבע</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((s) => (
            <tr key={s.id} className="border-b border-stone-100 last:border-0">
              <td className="px-4 py-2">
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                  aria-label={`בחר דגימה מ-${new Date(s.sampleDate).toLocaleDateString("he-IL")}`}
                  className="accent-wine w-4 h-4"
                />
              </td>
              <td className="px-4 py-2">{new Date(s.sampleDate).toLocaleDateString("he-IL")}</td>
              <td className="px-4 py-2">{s.blockName}</td>
              <td className="px-4 py-2">{s.brix ?? "—"}</td>
              <td className="px-4 py-2">{s.ph ?? "—"}</td>
              <td className="px-4 py-2">{s.titratableAcidity ?? "—"}</td>
              <td className="px-4 py-2">{s.color ?? "—"}</td>
            </tr>
          ))}
          {samples.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-stone-400">
                אין עדיין דגימות לעונה זו
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
