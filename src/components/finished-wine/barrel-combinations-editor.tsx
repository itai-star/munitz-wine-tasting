"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  addVarietyToCombination,
  createBarrelCombination,
  deleteBarrelCombination,
  removeVarietyFromCombination,
} from "@/server/actions/barrel-combination-actions"
import type { BarrelCombination } from "@/lib/barrel-plan"
import type { Result } from "@/types"

const buttonClass =
  "text-sm font-bold px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
const primaryClass =
  "text-sm font-bold px-4 py-2 rounded-lg bg-wine text-white hover:bg-wine-dark transition-colors disabled:opacity-50"

export function BarrelCombinationsEditor({
  combinations,
  allVarieties,
}: {
  combinations: BarrelCombination[]
  allVarieties: string[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [picked, setPicked] = useState<string[]>([])
  const [added, setAdded] = useState<Record<string, string>>({})

  const used = new Set(combinations.flatMap((combination) => combination.varieties))
  const free = allVarieties.filter((variety) => !used.has(variety)).sort((a, b) => a.localeCompare(b, "he"))

  async function run(action: () => Promise<Result<unknown>>, done?: () => void): Promise<void> {
    setBusy(true)
    setMessage("")
    const result = await action()
    setBusy(false)
    if (result.success) {
      done?.()
      router.refresh()
    } else {
      setMessage(result.error.message)
    }
  }

  function togglePicked(variety: string): void {
    setPicked((current) => (current.includes(variety) ? current.filter((item) => item !== variety) : [...current, variety]))
  }

  return (
    <details className="mt-4 bg-white rounded-2xl shadow-sm border border-stone-200 p-4 sm:p-5">
      <summary className="cursor-pointer text-base font-extrabold text-stone-900">
        שילובים מאושרים ({combinations.length})
      </summary>
      <p className="mt-2 text-sm text-stone-600">
        זנים מאותו שילוב יכולים לחלוק חבית כשלאף אחד מהם אין מספיק יין לחבית משלו. זן יכול להופיע בשילוב אחד בלבד.
      </p>

      {message && <p className="mt-3 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{message}</p>}

      <ul className="mt-4 space-y-3">
        {combinations.map((combination) => (
          <li key={combination.id} className="rounded-xl border border-stone-200 p-3">
            <ul className="flex flex-wrap gap-2">
              {combination.varieties.map((variety) => (
                <li key={variety} className="flex items-center gap-1.5 rounded-full bg-stone-100 ps-3 pe-1.5 py-1 text-sm font-bold text-stone-800">
                  {variety}
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`הסרת ${variety} מהשילוב`}
                    onClick={() => run(() => removeVarietyFromCombination({ combinationId: combination.id, variety }))}
                    className="h-6 w-6 rounded-full text-stone-500 hover:bg-stone-200 hover:text-stone-900 disabled:opacity-50"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm"
                value={added[combination.id] ?? ""}
                onChange={(event) => setAdded((current) => ({ ...current, [combination.id]: event.target.value }))}
                aria-label="זן להוספה לשילוב"
              >
                <option value="">הוספת זן לשילוב…</option>
                {free.map((variety) => (
                  <option key={variety} value={variety}>
                    {variety}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={buttonClass}
                disabled={busy || !added[combination.id]}
                onClick={() =>
                  run(
                    () => addVarietyToCombination({ combinationId: combination.id, variety: added[combination.id] }),
                    () => setAdded((current) => ({ ...current, [combination.id]: "" })),
                  )
                }
              >
                הוספה
              </button>
              <button
                type="button"
                className={`${buttonClass} text-red-700 border-red-200 hover:bg-red-50`}
                disabled={busy}
                onClick={() => {
                  if (confirm("למחוק את השילוב? הזנים עצמם לא יימחקו.")) void run(() => deleteBarrelCombination(combination.id))
                }}
              >
                מחיקת שילוב
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-xl border border-dashed border-stone-300 p-3">
        <h4 className="text-sm font-extrabold text-stone-900">שילוב חדש</h4>
        {free.length < 2 ? (
          <p className="mt-2 text-sm text-stone-600">אין מספיק זנים פנויים. כל הזנים כבר שייכים לשילובים.</p>
        ) : (
          <>
            <ul className="mt-2 flex flex-wrap gap-2">
              {free.map((variety) => (
                <li key={variety}>
                  <label className="flex items-center gap-2 rounded-full border border-stone-300 px-3 py-1.5 text-sm font-bold text-stone-800 cursor-pointer has-[:checked]:bg-wine has-[:checked]:text-white has-[:checked]:border-wine">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={picked.includes(variety)}
                      onChange={() => togglePicked(variety)}
                    />
                    {variety}
                  </label>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={`${primaryClass} mt-3`}
              disabled={busy || picked.length < 2}
              onClick={() => run(() => createBarrelCombination({ varieties: picked }), () => setPicked([]))}
            >
              {busy ? "שומר..." : "הוספת שילוב"}
            </button>
            {picked.length < 2 && <p className="mt-2 text-xs text-stone-500">יש לבחור לפחות שני זנים.</p>}
          </>
        )}
      </div>
    </details>
  )
}
