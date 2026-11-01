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

const NEW_COMBINATION = "new"
const FALLBACK_COLOR = "#a8a29e"

const chipBase = "inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm font-bold transition-colors disabled:opacity-50"
const softButton =
  "min-h-10 rounded-full border border-dashed border-stone-400 px-4 text-sm font-bold text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"

function Dot({ color }: { color: string }) {
  return <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: color }} aria-hidden="true" />
}

export function BarrelCombinationsEditor({
  combinations,
  redVarieties,
  colors,
}: {
  combinations: BarrelCombination[]
  redVarieties: string[]
  colors: Record<string, string>
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [openPanel, setOpenPanel] = useState<string | null>(null)
  const [picked, setPicked] = useState<string[]>([])

  const colorOf = (variety: string): string => colors[variety] ?? FALLBACK_COLOR

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

  function togglePanel(id: string): void {
    setMessage("")
    setPicked([])
    setOpenPanel((current) => (current === id ? null : id))
  }

  function togglePicked(variety: string): void {
    setPicked((current) => (current.includes(variety) ? current.filter((item) => item !== variety) : [...current, variety]))
  }

  return (
    <details open className="mt-4 bg-white rounded-2xl shadow-sm border border-stone-200 p-4 sm:p-5">
      <summary className="cursor-pointer text-lg font-extrabold text-stone-900">שילובים מאושרים ({combinations.length})</summary>
      <p className="mt-2 text-sm text-stone-600">
        זנים מאותו שילוב יכולים לחלוק חבית כשלאף אחד מהם אין מספיק יין לחבית משלו. אפשר להוסיף כל זן אדום, וזן יכול להופיע ביותר משילוב אחד.
      </p>

      {message && (
        <p role="alert" className="mt-3 text-sm font-bold text-red-700 bg-red-50 rounded-lg px-3 py-2">
          {message}
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {combinations.map((combination) => {
          const available = redVarieties.filter((variety) => !combination.varieties.includes(variety))
          const isOpen = openPanel === combination.id

          return (
            <li key={combination.id} className="rounded-xl border border-stone-200 p-3 sm:p-4">
              <ul className="flex flex-wrap gap-2">
                {combination.varieties.map((variety) => (
                  <li key={variety} className={`${chipBase} border-stone-300 bg-stone-50 ps-3.5 pe-1.5 text-stone-900`}>
                    <Dot color={colorOf(variety)} />
                    {variety}
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={`הסרת ${variety} מהשילוב`}
                      onClick={() => run(() => removeVarietyFromCombination({ combinationId: combination.id, variety }))}
                      className="h-8 w-8 rounded-full text-lg leading-none text-stone-500 hover:bg-stone-200 hover:text-stone-900 disabled:opacity-50"
                    >
                      ×
                    </button>
                  </li>
                ))}
                {available.length > 0 && (
                  <li>
                    <button type="button" className={softButton} aria-expanded={isOpen} onClick={() => togglePanel(combination.id)}>
                      {isOpen ? "סגירה" : "+ הוספת זן"}
                    </button>
                  </li>
                )}
              </ul>

              {isOpen && (
                <div className="mt-3 rounded-lg bg-stone-50 p-3">
                  <p className="text-sm font-bold text-stone-700">לחיצה על זן מוסיפה אותו לשילוב מיד</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {available.map((variety) => (
                      <li key={variety}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(() => addVarietyToCombination({ combinationId: combination.id, variety }))}
                          className={`${chipBase} border-stone-300 bg-white text-stone-900 hover:bg-stone-100`}
                        >
                          <Dot color={colorOf(variety)} />+ {variety}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (confirm("למחוק את השילוב? הזנים עצמם לא יימחקו.")) void run(() => deleteBarrelCombination(combination.id))
                  }}
                  className="min-h-9 px-2 text-sm font-bold text-red-700 hover:underline disabled:opacity-50"
                >
                  מחיקת שילוב
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-4">
        {openPanel === NEW_COMBINATION ? (
          <div className="rounded-xl border border-dashed border-stone-400 p-3 sm:p-4">
            <h4 className="text-base font-extrabold text-stone-900">שילוב חדש</h4>
            <p className="mt-1 text-sm text-stone-600">בחר שני זנים לפחות.</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {redVarieties.map((variety) => (
                <li key={variety}>
                  <label
                    className={`${chipBase} cursor-pointer border-stone-300 bg-white text-stone-900 has-[:checked]:border-wine has-[:checked]:bg-wine has-[:checked]:text-white`}
                  >
                    <input type="checkbox" className="sr-only" checked={picked.includes(variety)} onChange={() => togglePicked(variety)} />
                    <Dot color={colorOf(variety)} />
                    {variety}
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={busy || picked.length < 2}
                onClick={() => run(() => createBarrelCombination({ varieties: picked }), () => togglePanel(NEW_COMBINATION))}
                className="min-h-10 rounded-lg bg-wine px-5 text-sm font-bold text-white hover:bg-wine-dark transition-colors disabled:opacity-50"
              >
                {busy ? "שומר..." : "שמירת שילוב"}
              </button>
              <button type="button" className="min-h-10 px-2 text-sm font-bold text-stone-600 hover:underline" onClick={() => togglePanel(NEW_COMBINATION)}>
                ביטול
              </button>
              <span className="text-sm font-semibold text-stone-600">נבחרו {picked.length}</span>
            </div>
          </div>
        ) : (
          <button type="button" className={softButton} onClick={() => togglePanel(NEW_COMBINATION)}>
            + שילוב חדש
          </button>
        )}
      </div>
    </details>
  )
}
