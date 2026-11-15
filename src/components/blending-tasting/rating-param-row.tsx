"use client"

import { MAX_PARAM_NOTE } from "@/lib/barrel-rating"

// One parameter of the tasting form: its five levels as buttons that show their points, and a note that opens on demand.
export function RatingParamRow({
  label,
  points,
  level,
  note,
  isNoteOpen,
  onLevel,
  onNote,
  onToggleNote,
}: {
  label: string
  points: readonly number[]
  level: number | undefined
  note: string
  isNoteOpen: boolean
  onLevel: (level: number) => void
  onNote: (note: string) => void
  onToggleNote: () => void
}) {
  return (
    <div className="space-y-1.5 py-2.5 border-t border-stone-100 first:border-t-0">
      <div className="grid gap-2 md:grid-cols-[10rem_1fr_auto] md:items-center">
        <div className="flex items-center justify-between gap-2 md:contents">
          <span className={`text-base font-extrabold ${level ? "text-stone-900" : "text-stone-500"}`}>{label}</span>
          <button
            type="button"
            onClick={onToggleNote}
            aria-expanded={isNoteOpen}
            className={`min-h-10 rounded-lg px-2 text-sm font-bold md:order-3 ${note ? "text-wine" : "text-stone-500"} hover:bg-stone-50`}
          >
            {note ? "הערה ✓" : "+ הערה"}
          </button>
        </div>
        <div className="grid grid-cols-5 gap-1.5 md:order-2" role="radiogroup" aria-label={label}>
          {points.map((value, index) => {
            const isChosen = level === index + 1
            return (
              <button
                key={index}
                type="button"
                role="radio"
                aria-checked={isChosen}
                aria-label={`${label}: ${value} נקודות`}
                onClick={() => onLevel(index + 1)}
                className={`min-h-12 rounded-xl border-2 text-lg font-extrabold transition-colors ${
                  isChosen ? "border-wine bg-wine text-white" : "border-stone-200 bg-white text-stone-800 hover:border-wine/50"
                }`}
              >
                {value}
              </button>
            )
          })}
        </div>
      </div>
      {isNoteOpen && (
        <textarea
          rows={2}
          value={note}
          maxLength={MAX_PARAM_NOTE}
          onChange={(event) => onNote(event.target.value)}
          aria-label={`הערה על ${label}`}
          placeholder="הערה על הפרמטר"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-base focus:border-wine focus:ring-2 focus:ring-wine/20 outline-none"
        />
      )}
    </div>
  )
}
