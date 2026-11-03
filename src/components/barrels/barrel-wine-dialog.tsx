"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { setBarrelWine } from "@/server/actions/barrel-wine-actions"
import { LITERS_PER_BARREL_WITH_TOPPING } from "@/lib/barrel-plan"
import { formatPercent, validateShares } from "@/lib/barrel-wine"
import type { BarrelYearRow, BlockSupply } from "@/lib/barrel-room"

type Line = { blockId: string; percent: string }

const inputClass =
  "w-full min-h-11 border border-stone-300 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none bg-white"

function litersText(value: number): string {
  return `${Math.round(value).toLocaleString("he-IL")} ליטר`
}

function litersOfShare(percent: number): number {
  return (percent / 100) * LITERS_PER_BARREL_WITH_TOPPING
}

// Sets the wine of a barrel for a year. By hand the wine can only come from the finished wine of that year: the blocks
// offered are those that have finished wine, each with what is still free of it, and what is put in the barrel comes off
// that wine. Where the wine is a blend, each block has its share in percent.
export function BarrelWineDialog({ row, year, supply, onClose }: { row: BarrelYearRow; year: number; supply: BlockSupply[]; onClose: () => void }) {
  const router = useRouter()
  const [lines, setLines] = useState<Line[]>(
    row.parts.length > 0 ? row.parts.map((part) => ({ blockId: part.blockId, percent: String(part.percent) })) : [{ blockId: "", percent: "100" }],
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  // A block the barrel already holds stays selectable even when it has no finished wine, so an imported barrel can be edited.
  const supplyOf = new Map(supply.map((block) => [block.id, block]))
  const options = [
    ...supply,
    ...row.parts.filter((part) => !supplyOf.has(part.blockId)).map((part) => ({ id: part.blockId, name: part.blockName, variety: part.variety, forecastLiters: 0, usedLiters: 0 })),
  ]
  const ownLiters = new Map(row.parts.map((part) => [part.blockId, litersOfShare(part.percent)]))

  const chosen = lines.filter((line) => line.blockId !== "")
  const total = lines.reduce((sum, line) => sum + (Number(line.percent) || 0), 0)
  const sharesProblem = chosen.length === 0 ? null : validateShares(lines.map((line) => Number(line.percent)))
  const noFinishedWine = supply.length === 0 && row.parts.length === 0

  function update(index: number, change: Partial<Line>): void {
    setLines((current) => current.map((line, position) => (position === index ? { ...line, ...change } : line)))
  }

  function addLine(): void {
    const rest = Math.max(0, Math.round((100 - total) * 10) / 10)
    setLines((current) => [...current, { blockId: "", percent: String(rest) }])
  }

  async function save(parts: { blockId: string; percent: number }[]): Promise<void> {
    setBusy(true)
    setError("")
    const result = await setBarrelWine({ barrelId: row.id, year, parts })
    setBusy(false)
    if (result.success) {
      onClose()
      router.refresh()
    } else {
      setError(result.error.message)
    }
  }

  function submit(event: React.FormEvent): void {
    event.preventDefault()
    if (lines.some((line) => line.blockId === "")) {
      setError("יש לבחור כרם בכל שורה, או להסיר את השורה")
      return
    }
    void save(lines.map((line) => ({ blockId: line.blockId, percent: Number(line.percent) })))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label="עדכון יין בחבית"
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-stone-900">יין בחבית {row.number}</h2>
            <p className="text-sm font-semibold text-stone-600">
              שנה <bdi>{year}</bdi> · {row.type}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="סגירה" className="h-10 w-10 rounded-full text-2xl leading-none text-stone-500 hover:bg-stone-100">
            ×
          </button>
        </div>

        {noFinishedWine ? (
          <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-3 text-sm font-bold text-amber-900">
            אין יין מוכן במערכת לשנת {year}, ולכן אי אפשר להזין לחבית יין ידנית. יין לשנה הזו אפשר להכניס בייבוא מאקסל.
          </p>
        ) : (
          <>
            <p className="text-sm text-stone-600">
              היין בחבית יכול להיות רק מהיין המוכן של שנת {year}. כל חבית שמולאה מורידה מהיין המוכן {LITERS_PER_BARREL_WITH_TOPPING} ליטר: 225 בחבית ו-15 שנשמרים למילוי. כשהיין
              הוא שילוב של כמה כרמים, מוסיפים שורה לכל כרם עם האחוז שלו, והאחוזים צריכים להסתכם ב-100.
            </p>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                {error}
              </p>
            )}

            <ul className="space-y-3">
              {lines.map((line, index) => {
                const block = supplyOf.get(line.blockId)
                const takes = litersOfShare(Number(line.percent) || 0)
                const free = block ? block.forecastLiters - (block.usedLiters - (ownLiters.get(line.blockId) ?? 0)) : null
                return (
                  <li key={index} className="rounded-xl border border-stone-200 p-3">
                    <div className="grid grid-cols-[1fr_6.5rem_auto] items-end gap-2">
                      <div>
                        <label className="mb-1 block text-sm font-bold text-stone-800" htmlFor={`wine-block-${index}`}>
                          כרם
                        </label>
                        <select id={`wine-block-${index}`} className={inputClass} value={line.blockId} onChange={(event) => update(index, { blockId: event.target.value })}>
                          <option value="">— בחירה —</option>
                          {options.map((option) => (
                            <option key={option.id} value={option.id} disabled={lines.some((other, position) => position !== index && other.blockId === option.id)}>
                              {option.name} · {option.variety}
                              {supplyOf.has(option.id) ? "" : " (ללא יין מוכן)"}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-bold text-stone-800" htmlFor={`wine-percent-${index}`}>
                          אחוז
                        </label>
                        <input
                          id={`wine-percent-${index}`}
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min={0}
                          max={100}
                          className={inputClass}
                          value={line.percent}
                          onChange={(event) => update(index, { percent: event.target.value })}
                        />
                      </div>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          aria-label="הסרת כרם"
                          onClick={() => setLines((current) => current.filter((_, position) => position !== index))}
                          className="mb-0.5 h-10 w-10 rounded-full text-xl leading-none text-stone-500 hover:bg-stone-100"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    {block && free !== null && (
                      <p className={`mt-2 text-sm font-bold ${free - takes < 0 ? "text-red-700" : "text-stone-700"}`}>
                        יין מוכן פנוי: <bdi>{litersText(free)}</bdi> · יורדים: <bdi>{litersText(takes)}</bdi> · יישארו: <bdi>{litersText(free - takes)}</bdi>
                        {free - takes < 0 && " (יותר ממה שצפוי ביין המוכן)"}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={addLine} className="min-h-10 rounded-full border border-dashed border-stone-400 px-4 text-sm font-bold text-stone-700 hover:bg-stone-50">
                + הוספת כרם לשילוב
              </button>
              <span
                className={`rounded-full px-3 py-1 text-sm font-extrabold ${
                  chosen.length === 0 || sharesProblem === null ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"
                }`}
              >
                סך הכול <bdi>{formatPercent(Math.round(total * 10) / 10)}</bdi>
              </span>
            </div>
            {sharesProblem && <p className="text-sm font-bold text-amber-800">{sharesProblem}</p>}
          </>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {!noFinishedWine && (
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded-lg bg-wine px-6 text-base font-bold text-white hover:bg-wine-dark transition-colors disabled:opacity-50"
            >
              {busy ? "שומר..." : "שמירה"}
            </button>
          )}
          {row.parts.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (confirm("לרוקן את החבית לשנה הזו? היין חוזר ליין המוכן, ובדיקות המעבדה שלה נשארות.")) void save([])
              }}
              className="min-h-11 px-3 text-sm font-bold text-red-700 hover:underline disabled:opacity-50"
            >
              ריקון החבית
            </button>
          )}
          <button type="button" onClick={onClose} className="min-h-11 px-3 text-base font-bold text-stone-600 hover:underline">
            סגירה
          </button>
        </div>
      </form>
    </div>
  )
}
