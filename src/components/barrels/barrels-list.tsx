"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { removeBarrelFromStock } from "@/server/actions/barrel-actions"
import { useBarrelEditor } from "@/components/barrels/barrel-editor"
import type { BarrelRow } from "@/lib/barrel-room"

type Filter = "stock" | "removed" | "all"

const chip = "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-bold transition-colors"

function removedText(barrel: BarrelRow): string {
  const date = barrel.removedOn ? barrel.removedOn.split("-").reverse().join(".") : ""
  return `הוצאה${date ? ` ב-${date}` : ""}${barrel.removalNote ? `: ${barrel.removalNote}` : ""}`
}

export function BarrelsList({ barrels }: { barrels: BarrelRow[] }) {
  const router = useRouter()
  const { openEdit } = useBarrelEditor()
  const [filter, setFilter] = useState<Filter>("stock")
  const [search, setSearch] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const counts = { stock: barrels.filter((barrel) => !barrel.removed).length, removed: barrels.filter((barrel) => barrel.removed).length, all: barrels.length }
  const visible = useMemo(() => {
    const text = search.trim().toLowerCase()
    return barrels.filter((barrel) => {
      if (filter === "stock" && barrel.removed) return false
      if (filter === "removed" && !barrel.removed) return false
      return text === "" || `${barrel.number} ${barrel.type} ${barrel.year}`.toLowerCase().includes(text)
    })
  }, [barrels, filter, search])

  async function remove(barrel: BarrelRow): Promise<void> {
    if (!confirm(`להוציא את חבית ${barrel.number} מהמלאי? אפשר להחזיר אותה אחר כך.`)) return
    setBusyId(barrel.id)
    setError("")
    const result = await removeBarrelFromStock({ id: barrel.id, note: "" })
    setBusyId(null)
    if (result.success) router.refresh()
    else setError(result.error.message)
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "stock", label: "בחדר" },
    { key: "removed", label: "הוצאו מהמלאי" },
    { key: "all", label: "הכול" },
  ]

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={`${chip} ${filter === key ? "border-wine bg-wine text-white" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"}`}
          >
            {label}
            <span className={`rounded-full px-1.5 text-xs font-extrabold ${filter === key ? "bg-white/25" : "bg-stone-200 text-stone-800"}`}>{counts[key]}</span>
          </button>
        ))}
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="חיפוש לפי מספר, סוג או שנה"
          aria-label="חיפוש חבית"
          className="min-h-10 min-w-0 flex-1 basis-48 rounded-lg border border-stone-300 bg-white px-3 text-base"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-base text-stone-500">
          {barrels.length === 0 ? "עדיין אין חביות. אפשר להוסיף חבית או לייבא רשימה מאקסל." : "אין חביות שמתאימות לחיפוש."}
        </p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((barrel) => (
            <li key={barrel.id} className={`rounded-xl border bg-white p-3 ${barrel.removed ? "border-stone-200 opacity-75" : "border-stone-200"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-extrabold text-stone-900">
                    חבית <bdi>{barrel.number}</bdi>
                  </p>
                  <p className="text-base font-semibold text-stone-700 break-words">{barrel.type}</p>
                  <p className="text-sm font-bold text-stone-600">
                    שנה <bdi>{barrel.year}</bdi>
                  </p>
                </div>
                {barrel.removed ? (
                  <span className="shrink-0 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs font-extrabold text-amber-900">הוצאה</span>
                ) : (
                  <span className="shrink-0 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-xs font-extrabold text-emerald-900">בחדר</span>
                )}
              </div>
              {barrel.removed && <p className="mt-1 text-sm font-semibold text-amber-900">{removedText(barrel)}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(barrel)}
                  className="min-h-10 rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50"
                >
                  עריכה
                </button>
                {!barrel.removed && (
                  <button
                    type="button"
                    disabled={busyId === barrel.id}
                    onClick={() => remove(barrel)}
                    className="min-h-10 rounded-lg px-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    הוצאה מהמלאי
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
