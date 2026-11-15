"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { saveBarrelRating } from "@/server/actions/barrel-rating-actions"
import { RatingParamRow } from "@/components/blending-tasting/rating-param-row"
import { colorsByVariety } from "@/components/finished-wine/barrel-parts"
import { MAX_RATING_NOTES, RATING_PARAMS, totalOf } from "@/lib/barrel-rating"
import type { RatingKey } from "@/lib/barrel-rating"
import { formatPercent } from "@/lib/barrel-wine"
import type { MyRating, RatingBarrel } from "@/server/barrel-rating-data"

type PickerBarrel = { fillId: string; number: string; variety: string; rated: boolean }

// The columns of the paper form: a form rated all in one column adds up to the number above it.
const COLUMN_TOTALS = [40, 56, 72, 86, 100]
const GROUPS = Array.from(new Set(RATING_PARAMS.map((param) => param.group)))

// The tasting form of one barrel, with the barrels of the year above it to move between. Saving goes on to the next barrel the
// taster has not rated yet; moving away with changes not saved asks first.
export function RatingScreen({
  year,
  barrels,
  barrel,
  initial,
  nextFillId,
}: {
  year: number
  barrels: PickerBarrel[]
  barrel: RatingBarrel
  initial: MyRating | null
  nextFillId: string | null
}) {
  const router = useRouter()
  const [levels, setLevels] = useState<Partial<Record<RatingKey, number>>>(initial?.levels ?? {})
  const [paramNotes, setParamNotes] = useState<Partial<Record<RatingKey, string>>>(initial?.paramNotes ?? {})
  const [openNotes, setOpenNotes] = useState<Set<RatingKey>>(new Set(Object.keys(initial?.paramNotes ?? {}) as RatingKey[]))
  const [notes, setNotes] = useState(initial?.notes ?? "")
  const [isDirty, setIsDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [savedAll, setSavedAll] = useState(false)

  const colors = colorsByVariety(barrels.map((candidate) => candidate.variety))
  const missing = RATING_PARAMS.filter((param) => !levels[param.key]).length
  const ratedCount = barrels.filter((candidate) => candidate.rated).length

  function go(fillId: string): void {
    if (fillId === barrel.fillId) return
    if (isDirty && !confirm("יש בטופס שינויים שלא נשמרו. לעבור לחבית אחרת בלי לשמור?")) return
    router.push(`/admin/blending/tasting?year=${year}&barrel=${fillId}`)
  }

  function change<T>(update: (value: T) => void): (value: T) => void {
    return (value) => {
      update(value)
      setIsDirty(true)
      setSavedAll(false)
    }
  }

  async function save(): Promise<void> {
    if (missing > 0) {
      setError(missing === 1 ? "חסר דירוג בפרמטר אחד" : `חסר דירוג ב-${missing} פרמטרים`)
      return
    }
    setBusy(true)
    setError("")
    const result = await saveBarrelRating({
      fillId: barrel.fillId,
      levels: levels as Record<RatingKey, number>,
      paramNotes: Object.fromEntries(Object.entries(paramNotes).filter(([, note]) => note && note.trim() !== "")) as Record<string, string>,
      notes,
    })
    setBusy(false)
    if (!result.success) {
      setError(result.error.message)
      return
    }
    setIsDirty(false)
    if (nextFillId) router.push(`/admin/blending/tasting?year=${year}&barrel=${nextFillId}`)
    else {
      setSavedAll(true)
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <nav aria-label="החביות של הטעימה" className="space-y-2">
        <p className="text-sm font-bold text-stone-700">
          דירגת <bdi>{ratedCount}</bdi> מתוך <bdi>{barrels.length}</bdi> חביות
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {barrels.map((candidate) => {
            const isCurrent = candidate.fillId === barrel.fillId
            return (
              <li key={candidate.fillId}>
                <button
                  type="button"
                  onClick={() => go(candidate.fillId)}
                  aria-current={isCurrent ? "true" : undefined}
                  aria-label={`חבית ${candidate.number}${candidate.rated ? ", דורגה" : ""}`}
                  className={`flex min-h-10 min-w-12 items-center justify-center gap-1 rounded-lg border-2 px-2 text-sm font-extrabold ${
                    isCurrent ? "border-wine bg-wine/10 text-wine" : candidate.rated ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-stone-200 bg-white text-stone-800"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.get(candidate.variety) }} aria-hidden="true" />
                  <bdi>{candidate.number}</bdi>
                  {candidate.rated && <span aria-hidden="true">✓</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm" aria-label={`טופס הטעימה של חבית ${barrel.number}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-extrabold text-stone-900">
            חבית <bdi>{barrel.number}</bdi>
          </h2>
          <span className="text-sm font-semibold text-stone-600">{barrel.type}</span>
        </div>
        <p className="mt-1 text-sm font-bold text-stone-700">
          {barrel.parts.map((part) => `${part.blockName} · ${part.variety}${barrel.parts.length > 1 ? ` ${formatPercent(part.percent)}` : ""}`).join(" + ")}
        </p>

        <div className="mt-4 hidden md:grid md:grid-cols-[10rem_1fr_auto] md:gap-2 text-xs font-bold text-stone-500" aria-hidden="true">
          <span />
          <span className="grid grid-cols-5 gap-1.5 text-center">
            {COLUMN_TOTALS.map((total) => (
              <span key={total}>{total}</span>
            ))}
          </span>
          <span className="w-16" />
        </div>

        {GROUPS.map((group) => {
          const params = RATING_PARAMS.filter((param) => param.group === group)
          const isSingle = params.length === 1 && params[0].label === group
          return (
            <fieldset key={group} className="mt-3">
              {!isSingle && <legend className="text-sm font-extrabold uppercase tracking-wide text-wine">{group}</legend>}
              {params.map((param) => (
                <RatingParamRow
                  key={param.key}
                  label={param.label}
                  points={param.points}
                  level={levels[param.key]}
                  note={paramNotes[param.key] ?? ""}
                  isNoteOpen={openNotes.has(param.key)}
                  onLevel={change((level: number) => setLevels((current) => ({ ...current, [param.key]: level })))}
                  onNote={change((note: string) => setParamNotes((current) => ({ ...current, [param.key]: note })))}
                  onToggleNote={() =>
                    setOpenNotes((current) => {
                      const next = new Set(current)
                      if (next.has(param.key)) next.delete(param.key)
                      else next.add(param.key)
                      return next
                    })
                  }
                />
              ))}
            </fieldset>
          )
        })}

        <div className="mt-4">
          <label htmlFor="rating-notes" className="block text-base font-extrabold text-stone-900 mb-1">
            הערה כללית
          </label>
          <textarea
            id="rating-notes"
            rows={3}
            value={notes}
            maxLength={MAX_RATING_NOTES}
            onChange={(event) => change(setNotes)(event.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-base focus:border-wine focus:ring-2 focus:ring-wine/20 outline-none"
          />
        </div>
      </section>

      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-4 z-20 rounded-2xl border border-stone-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base font-semibold text-stone-700">
            <span className="text-2xl font-extrabold text-stone-900">
              <bdi>{totalOf(levels)}</bdi>
            </span>{" "}
            / 100
            <span className="ms-2 text-sm font-bold">{missing === 0 ? "הטופס מלא" : missing === 1 ? "חסר פרמטר אחד" : `חסרים ${missing} פרמטרים`}</span>
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="min-h-12 rounded-xl bg-wine px-6 text-base font-bold text-white hover:bg-wine-dark transition-colors disabled:opacity-50"
          >
            {busy ? "שומר..." : nextFillId ? "שמירה ומעבר לחבית הבאה" : "שמירה"}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
            {error}
          </p>
        )}
        {savedAll && <p className="mt-2 text-sm font-bold text-emerald-700">נשמר. דירגת את כל החביות של {year}, ואפשר לחזור לכל חבית ולשנות.</p>}
      </div>
    </div>
  )
}
