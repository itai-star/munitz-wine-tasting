"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { setBlendTasters } from "@/server/actions/barrel-rating-actions"
import type { Rater } from "@/lib/barrel-rating"

// For an administrator: who tastes the barrels of the year. The list holds everyone who can open the blending.
export function TastersButton({ year, candidates, tasters }: { year: number; candidates: Rater[]; tasters: Rater[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [chosen, setChosen] = useState<Set<string>>(new Set(tasters.map((taster) => taster.userId)))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  function toggle(userId: string): void {
    setChosen((current) => {
      const next = new Set(current)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  async function save(): Promise<void> {
    setBusy(true)
    setError("")
    const result = await setBlendTasters({ year, userIds: [...chosen] })
    setBusy(false)
    if (result.success) {
      setOpen(false)
      router.refresh()
    } else {
      setError(result.error.message)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setChosen(new Set(tasters.map((taster) => taster.userId)))
          setError("")
          setOpen(true)
        }}
        className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50 transition-colors"
      >
        משתתפי הטעימה ({tasters.length})
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="משתתפי הטעימה"
            onClick={(event) => event.stopPropagation()}
            className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            <div>
              <h2 className="text-xl font-extrabold text-stone-900">משתתפי הטעימה, בציר {year}</h2>
              <p className="text-sm font-semibold text-stone-600">רק מי שמסומן כאן יכול לדרג את החביות של {year}. מנהל רואה תמיד את כל התוצאות.</p>
            </div>
            {candidates.length === 0 ? (
              <p className="text-base font-semibold text-stone-500">אין משתמשים עם גישה לבלנדינג.</p>
            ) : (
              <ul className="space-y-1">
                {candidates.map((candidate) => (
                  <li key={candidate.userId}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-base font-bold text-stone-900 hover:bg-stone-50">
                      <input type="checkbox" className="h-5 w-5 accent-wine" checked={chosen.has(candidate.userId)} onChange={() => toggle(candidate.userId)} />
                      {candidate.username}
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void save()}
                className="min-h-11 rounded-lg bg-wine px-6 text-base font-bold text-white hover:bg-wine-dark transition-colors disabled:opacity-50"
              >
                {busy ? "שומר..." : "שמירה"}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 px-3 text-base font-bold text-stone-600 hover:underline">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
