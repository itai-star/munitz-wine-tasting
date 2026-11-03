"use client"

import { useBarrelEditor } from "@/components/barrels/barrel-editor"
import type { BarrelRow } from "@/lib/barrel-room"

// Every barrel that left the stock, whatever the year, so one can be put back even when the year on the page is later
// than the year it left.
export function RemovedBarrels({ barrels }: { barrels: BarrelRow[] }) {
  const { openEdit } = useBarrelEditor()
  if (barrels.length === 0) return null

  return (
    <details className="rounded-2xl border border-stone-200 bg-white p-4">
      <summary className="cursor-pointer text-base font-extrabold text-wine">חביות שהוצאו מהמלאי, מכל השנים ({barrels.length})</summary>
      <ul className="mt-3 space-y-2">
        {barrels.map((barrel) => (
          <li key={barrel.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-stone-200 p-3">
            <span className="text-base font-extrabold text-stone-900">
              חבית <bdi>{barrel.number}</bdi>
            </span>
            <span className="text-sm font-semibold text-stone-600">
              {barrel.type} · שנת חבית <bdi>{barrel.year}</bdi>
            </span>
            <span className="text-sm font-semibold text-amber-900">
              הוצאה ב-<bdi>{barrel.removedOn?.split("-").reverse().join(".")}</bdi>
              {barrel.removalNote ? `: ${barrel.removalNote}` : ""}
            </span>
            <button type="button" onClick={() => openEdit(barrel)} className="ms-auto min-h-10 rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50">
              פתיחה
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}
