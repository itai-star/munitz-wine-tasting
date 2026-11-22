"use client"

import { useEffect, useState } from "react"
import { LabGrid } from "@/components/blending/blending-parts"
import { LAB_MEASURES } from "@/lib/blending"
import type { BarrelLab } from "@/lib/blending"
import type { RatingLabTest } from "@/server/barrel-rating-data"

function dayText(day: string): string {
  return day.split("-").reverse().join(".")
}

// A button on the tasting form that opens the lab tests of the barrel in a window, so the taster has them at hand while
// tasting: the latest value of every measurement, and below it every test with its values.
export function LabPopup({ number, lab, tests }: { number: string; lab: BarrelLab; tests: RatingLabTest[] }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 bg-white px-3 text-sm font-bold text-stone-800 hover:bg-stone-50"
      >
        נתוני מעבדה{lab.tests > 0 ? ` (${lab.tests})` : ""}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`נתוני מעבדה של חבית ${number}`}
            onClick={(event) => event.stopPropagation()}
            className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-stone-900">
                  נתוני מעבדה, חבית <bdi>{number}</bdi>
                </h2>
                {lab.tests > 0 && lab.latestDate && (
                  <p className="text-sm font-semibold text-stone-600">
                    {lab.tests === 1 ? "בדיקה אחת" : `${lab.tests} בדיקות`}, האחרונה ב-<bdi>{dayText(lab.latestDate)}</bdi>
                  </p>
                )}
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="סגירה" className="h-10 w-10 rounded-full text-2xl leading-none text-stone-500 hover:bg-stone-100">
                ×
              </button>
            </div>

            {tests.length === 0 ? (
              <p className="rounded-xl border border-stone-200 p-4 text-center text-base font-semibold text-stone-500">אין עדיין בדיקות מעבדה לחבית הזו.</p>
            ) : (
              <>
                <section className="space-y-2" aria-label="הערך האחרון בכל מדד">
                  <h3 className="text-base font-extrabold text-stone-900">הערך האחרון בכל מדד</h3>
                  <LabGrid lab={lab} />
                </section>

                <section className="space-y-2" aria-label="כל הבדיקות">
                  <h3 className="text-base font-extrabold text-stone-900">כל הבדיקות</h3>
                  <ul className="space-y-3">
                    {tests.map((test) => (
                      <li key={test.id} className="rounded-xl border border-stone-200 p-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-base font-extrabold text-stone-900">
                            <bdi>{dayText(test.date)}</bdi>
                          </span>
                          <span className="text-sm font-semibold text-stone-600">{test.lab ?? "ללא שם מעבדה"}</span>
                        </div>
                        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                          {LAB_MEASURES.map((measure) => (
                            <div key={measure.key} className="flex justify-between gap-2">
                              <dt className="font-semibold text-stone-600">{measure.label}</dt>
                              <dd className="font-extrabold text-stone-900">
                                <bdi>{test.values[measure.key] ?? "—"}</bdi>
                              </dd>
                            </div>
                          ))}
                        </dl>
                        {test.notes && <p className="mt-2 whitespace-pre-line text-sm text-stone-600">{test.notes}</p>}
                        {test.actionItems && (
                          <p className="mt-1 whitespace-pre-line text-sm text-stone-800">
                            <span className="font-bold">פעולות לביצוע:</span> {test.actionItems}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              </>
            )}

            <button type="button" onClick={() => setOpen(false)} className="min-h-11 px-3 text-base font-bold text-stone-600 hover:underline">
              סגירה
            </button>
          </div>
        </div>
      )}
    </>
  )
}
