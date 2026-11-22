"use client"

import { useEffect, useState } from "react"
import { RATING_PARAMS } from "@/lib/barrel-rating"
import type { RatingNote } from "@/lib/barrel-rating"

function labelOf(key: string): string {
  const param = RATING_PARAMS.find((candidate) => candidate.key === key)
  if (!param) return key
  return param.group === param.label ? param.label : `${param.group}, ${param.label}`
}

// How many notes the tasters wrote on a barrel: a note on a parameter, or the general note of a form.
export function noteCount(notes: RatingNote[]): number {
  return notes.reduce((sum, note) => sum + note.params.length + (note.general ? 1 : 0), 0)
}

// A button that opens the notes the tasters wrote on a barrel, each under the name of the taster who wrote it: the note of every
// parameter, and the general note of the form.
export function NotesPopup({ number, notes }: { number: string; notes: RatingNote[] }) {
  const [open, setOpen] = useState(false)
  const count = noteCount(notes)

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  if (count === 0) return <span className="text-stone-400">—</span>

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-9 items-center rounded-lg border border-stone-300 bg-white px-2.5 text-sm font-bold text-stone-800 hover:bg-stone-50"
      >
        הערות (<bdi>{count}</bdi>)
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`הערות הטועמים על חבית ${number}`}
            onClick={(event) => event.stopPropagation()}
            className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-stone-900">
                  הערות הטועמים, חבית <bdi>{number}</bdi>
                </h2>
                <p className="text-sm font-semibold text-stone-600">
                  <bdi>{count}</bdi> {count === 1 ? "הערה" : "הערות"} מ-<bdi>{notes.length}</bdi> {notes.length === 1 ? "טועם" : "טועמים"}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="סגירה" className="h-10 w-10 rounded-full text-2xl leading-none text-stone-500 hover:bg-stone-100">
                ×
              </button>
            </div>

            <ul className="space-y-4">
              {notes.map((note) => (
                <li key={note.rater.userId} className="rounded-xl border border-stone-200 p-3 space-y-2">
                  <h3 className="text-base font-extrabold text-wine">{note.rater.username}</h3>
                  {note.general && (
                    <div>
                      <p className="text-xs font-bold text-stone-500">הערה כללית</p>
                      <p className="whitespace-pre-line text-base text-stone-900">{note.general}</p>
                    </div>
                  )}
                  {note.params.map((param) => (
                    <div key={param.key}>
                      <p className="text-xs font-bold text-stone-500">{labelOf(param.key)}</p>
                      <p className="whitespace-pre-line text-base text-stone-900">{param.note}</p>
                    </div>
                  ))}
                </li>
              ))}
            </ul>

            <button type="button" onClick={() => setOpen(false)} className="min-h-11 px-3 text-base font-bold text-stone-600 hover:underline">
              סגירה
            </button>
          </div>
        </div>
      )}
    </>
  )
}
