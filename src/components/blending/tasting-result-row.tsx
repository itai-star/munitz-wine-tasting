"use client"

import { useState } from "react"
import type { RatingFlag, RatingParamSummary } from "@/lib/barrel-rating"

function flagText(flag: RatingFlag): string {
  return flag.kind === "outlier"
    ? `${flag.rater.username}: ${flag.points} נקודות, כשממוצע האחרים ${flag.othersAverage}`
    : `${flag.rater.username}: ${flag.points} נקודות`
}

function flagsTitle(flags: RatingFlag[]): string {
  const heading = flags[0]?.kind === "gap" ? "פער בין שני הטועמים" : "דירוג חריג"
  return `${heading}: ${flags.map(flagText).join(" · ")}`
}

// One parameter of a barrel's tasting: the points it counts for, out of its maximum, with a bar. When an administrator chose a
// level instead of the average, the row says so and still shows the average. A mark points to ratings that stand out: its
// details show on hover, and on a tap for phones. In editing mode the administrator picks a level, or goes back to the average.
export function TastingResultRow({
  label,
  points,
  row,
  editing,
  draftLevel,
  onDraft,
}: {
  label: string
  points: readonly number[]
  row: RatingParamSummary
  editing: boolean
  draftLevel: number | null
  onDraft: (level: number | null) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const lowest = points[0]
  const value = row.final ?? 0
  const share = row.final === null ? 0 : Math.max(0, Math.min(100, ((value - lowest) / (row.max - lowest)) * 100))
  const isGap = row.flags[0]?.kind === "gap"

  return (
    <li className="space-y-1">
      <div className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-2 text-sm">
        <span className="font-semibold text-stone-700">{label}</span>
        <span className="h-2 rounded-full bg-stone-100 overflow-hidden" aria-hidden="true">
          <span className={`block h-full rounded-full ${row.decidedLevel !== null ? "bg-indigo-600" : "bg-wine"}`} style={{ width: `${share}%` }} />
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          {row.flags.length > 0 && (
            <button
              type="button"
              onClick={() => setIsOpen((current) => !current)}
              aria-expanded={isOpen}
              aria-label={flagsTitle(row.flags)}
              title={flagsTitle(row.flags)}
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ring-1 ${
                isGap ? "bg-sky-100 text-sky-900 ring-sky-400" : "bg-amber-300 text-stone-900 ring-amber-600"
              }`}
            >
              {isGap ? "↔" : "!"}
            </button>
          )}
          {row.decidedLevel !== null && <span className="rounded-full bg-indigo-100 px-1.5 py-px text-[11px] font-extrabold text-indigo-900">הוחלט</span>}
          <span className="font-extrabold text-stone-900">
            <bdi>{row.final ?? "—"}</bdi>
            <span className="font-semibold text-stone-500"> / {row.max}</span>
          </span>
        </span>
      </div>

      {row.decidedLevel !== null && row.average !== null && (
        <p className="text-xs font-semibold text-stone-500 ps-1">
          ממוצע הטועמים: <bdi>{row.average}</bdi>
        </p>
      )}
      {isOpen && (
        <p className={`rounded-lg px-2 py-1 text-xs font-bold ${isGap ? "bg-sky-50 text-sky-900" : "bg-amber-50 text-amber-900"}`}>{flagsTitle(row.flags)}</p>
      )}

      {editing && (
        <div className="flex flex-wrap items-center gap-1 ps-1" role="radiogroup" aria-label={`החלטה על ${label}`}>
          {points.map((value, index) => {
            const isChosen = draftLevel === index + 1
            return (
              <button
                key={index}
                type="button"
                role="radio"
                aria-checked={isChosen}
                onClick={() => onDraft(index + 1)}
                className={`min-h-9 min-w-9 rounded-lg border-2 px-1.5 text-sm font-extrabold ${isChosen ? "border-indigo-600 bg-indigo-600 text-white" : "border-stone-200 bg-white text-stone-800"}`}
              >
                {value}
              </button>
            )
          })}
          <button
            type="button"
            role="radio"
            aria-checked={draftLevel === null}
            onClick={() => onDraft(null)}
            className={`min-h-9 rounded-lg border-2 px-2 text-xs font-bold ${draftLevel === null ? "border-wine bg-wine/10 text-wine" : "border-stone-200 bg-white text-stone-600"}`}
          >
            ממוצע
          </button>
        </div>
      )}
    </li>
  )
}
