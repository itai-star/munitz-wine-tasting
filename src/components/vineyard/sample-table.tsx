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

  async function runDelete(ids: string[]) {
    setDeleting(true)
    setError("")
    const result = await deleteSamples(ids)
    setDeleting(false)

    if (result.success) {
      setSelected((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
      router.refresh()
    } else {
      setError(result.error.message)
    }
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return
    if (!confirm(`למחוק ${selected.size} דגימות שנבחרו?`)) return
    await runDelete(Array.from(selected))
  }

  async function handleDeleteOne(id: string) {
    if (!confirm("למחוק את הדגימה?")) return
    await runDelete([id])
  }

  const deleteButtonClass =
    "inline-flex items-center gap-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors px-2 py-1 text-xs font-medium disabled:opacity-40"

  const trashIcon = (
    <svg
      className="w-3.5 h-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h16" />
      <path d="M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6" />
      <path d="M6 6l1 14.5A1.5 1.5 0 0 0 8.5 22h7a1.5 1.5 0 0 0 1.5-1.5L18 6" />
    </svg>
  )

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-x-auto">
      <div className="flex items-center justify-between gap-3 p-3 border-b border-stone-200 flex-wrap">
        <div className="flex items-center gap-3">
          <label className="sm:hidden flex items-center gap-1.5 text-sm text-stone-500">
            <input
              type="checkbox"
              checked={samples.length > 0 && selected.size === samples.length}
              onChange={toggleAll}
              aria-label="בחר הכל"
              className="accent-wine w-4 h-4"
            />
            הכל
          </label>
          <span className="text-sm text-stone-500">
            {selected.size > 0 ? `${selected.size} נבחרו` : `${samples.length} דגימות`}
          </span>
        </div>
        <button
          type="button"
          onClick={handleDeleteSelected}
          disabled={selected.size === 0 || deleting}
          className="text-sm text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
        >
          {deleting ? "מוחק..." : "מחק נבחרים"}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm px-3 py-2">{error}</p>}

      {/* Mobile: stacked cards */}
      <div className="sm:hidden divide-y divide-stone-100">
        {samples.map((s) => (
          <div key={s.id} className="flex items-start gap-3 p-4">
            <input
              type="checkbox"
              checked={selected.has(s.id)}
              onChange={() => toggle(s.id)}
              aria-label={`בחר דגימה מ-${new Date(s.sampleDate).toLocaleDateString("he-IL")}`}
              className="accent-wine w-5 h-5 mt-0.5 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-stone-800">{s.blockName}</span>
                <span className="text-xs text-stone-500 shrink-0">
                  {new Date(s.sampleDate).toLocaleDateString("he-IL")}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-stone-600">
                <span>בומה: {s.brix ?? "—"}</span>
                <span>PH: {s.ph ?? "—"}</span>
                <span>חמיצות: {s.titratableAcidity ?? "—"}</span>
                <span>צבע: {s.color ?? "—"}</span>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteOne(s.id)}
                disabled={deleting}
                className={`${deleteButtonClass} mt-2`}
              >
                {trashIcon}
                מחק דגימה
              </button>
            </div>
          </div>
        ))}
        {samples.length === 0 && (
          <p className="px-4 py-6 text-center text-stone-400 text-sm">
            אין עדיין דגימות לעונה זו
          </p>
        )}
      </div>

      {/* Desktop / tablet: table */}
      <table className="w-full text-sm hidden sm:table">
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
            <th className="px-4 py-2 font-medium"></th>
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
              <td className="px-4 py-2">
                <button
                  type="button"
                  onClick={() => handleDeleteOne(s.id)}
                  disabled={deleting}
                  className={deleteButtonClass}
                >
                  {trashIcon}
                  מחק
                </button>
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
              <td colSpan={8} className="px-4 py-6 text-center text-stone-400">
                אין עדיין דגימות לעונה זו
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
