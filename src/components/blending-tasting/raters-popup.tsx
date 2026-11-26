"use client"

import { useEffect } from "react"
import { RATING_PARAMS } from "@/lib/barrel-rating"
import type { RaterForm, RatingFlag, RatingSummary } from "@/lib/barrel-rating"

function labelOf(group: string, label: string): string {
  return group === label ? label : `${group}, ${label}`
}

export function totalFlagText(flag: RatingFlag): string {
  return flag.kind === "gap"
    ? `${flag.rater.username}: ${flag.points}, פער מהטועם השני (${flag.othersAverage})`
    : `${flag.rater.username}: ${flag.points}, כשממוצע האחרים ${flag.othersAverage}`
}

function TasterCard({ form, summary }: { form: RaterForm; summary: RatingSummary }) {
  const totalFlag = summary.totalFlags.find((flag) => flag.rater.userId === form.rater.userId)
  const flagged = new Set(summary.params.filter((param) => param.flags.some((flag) => flag.rater.userId === form.rater.userId)).map((param) => param.key))
  return (
    <li className={`rounded-xl border-2 p-3 space-y-2 ${totalFlag ? "border-amber-400 bg-amber-50/50" : "border-stone-200"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-extrabold text-wine">{form.rater.username}</h3>
        <p className="flex items-center gap-2">
          {totalFlag && (
            <span className="rounded-full bg-amber-300 px-2 py-0.5 text-xs font-extrabold text-stone-900" title={totalFlagText(totalFlag)}>
              ! {totalFlag.kind === "gap" ? "פער" : "ציון חריג"}
            </span>
          )}
          <span className="text-2xl font-extrabold text-stone-900">
            <bdi>{form.total}</bdi>
          </span>
          <span className="text-sm font-semibold text-stone-500">/ 100</span>
        </p>
      </div>
      {totalFlag && <p className="text-xs font-bold text-amber-900">{totalFlagText(totalFlag)}</p>}

      <ul className="divide-y divide-stone-100">
        {RATING_PARAMS.map((param) => (
          <li key={param.key} className="py-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold text-stone-700">{labelOf(param.group, param.label)}</span>
              <span className={`whitespace-nowrap font-extrabold ${flagged.has(param.key) ? "text-amber-800" : "text-stone-900"}`}>
                {flagged.has(param.key) && <span title="דירוג חריג בפרמטר">! </span>}
                <bdi>{form.points[param.key]}</bdi>
                <span className="font-semibold text-stone-400"> / {param.points[param.points.length - 1]}</span>
              </span>
            </div>
            {form.notes[param.key] && <p className="mt-0.5 whitespace-pre-line rounded-md bg-stone-100 px-2 py-1 text-sm text-stone-800">{form.notes[param.key]}</p>}
          </li>
        ))}
      </ul>

      {form.general && (
        <div>
          <p className="text-xs font-bold text-stone-500">הערה כללית</p>
          <p className="whitespace-pre-line text-base text-stone-900">{form.general}</p>
        </div>
      )}
    </li>
  )
}

// Every taster's form of a barrel, side by side with the average: each taster's score, the points of every parameter, and what
// they wrote. Scores and parameters that stand out are marked.
export function RatersPopup({ number, summary, forms, onClose }: { number: string; summary: RatingSummary; forms: RaterForm[]; onClose: () => void }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`פירוט הטועמים של חבית ${number}`}
        onClick={(event) => event.stopPropagation()}
        className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-stone-900">
              פירוט הטועמים, חבית <bdi>{number}</bdi>
            </h2>
            <p className="text-base font-extrabold text-stone-900">
              ציון ממוצע <bdi>{summary.total ?? "—"}</bdi> מתוך 100
              {summary.hasDecision && (
                <span className="text-indigo-900">
                  {" "}
                  · ציון סופי <bdi>{summary.finalTotal ?? "—"}</bdi> (הוחלט)
                </span>
              )}
              <span className="text-sm font-semibold text-stone-500">
                {" "}
                · <bdi>{forms.length}</bdi> {forms.length === 1 ? "טועם" : "טועמים"}
              </span>
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="סגירה" className="h-10 w-10 rounded-full text-2xl leading-none text-stone-500 hover:bg-stone-100">
            ×
          </button>
        </div>

        {forms.length === 0 ? (
          <p className="rounded-xl border border-stone-200 p-4 text-center text-base font-semibold text-stone-500">עדיין אין טפסים לחבית הזו.</p>
        ) : (
          <ul className="space-y-3">
            {forms.map((form) => (
              <TasterCard key={form.rater.userId} form={form} summary={summary} />
            ))}
          </ul>
        )}

        <button type="button" onClick={onClose} className="min-h-11 px-3 text-base font-bold text-stone-600 hover:underline">
          סגירה
        </button>
      </div>
    </div>
  )
}
