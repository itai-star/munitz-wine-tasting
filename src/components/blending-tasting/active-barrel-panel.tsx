"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cancelActiveBarrel, setActiveBarrel } from "@/server/actions/barrel-rating-actions"
import { canCancel, canMoveOn } from "@/lib/barrel-rating"
import type { ActiveTasting } from "@/lib/barrel-rating"

type PanelBarrel = { fillId: string; number: string; forms: number }

// For an administrator: the barrel being tasted now, who saved a form for it and who has not, and the choice of the next
// barrel, which opens once every taster saved theirs. A barrel chosen by mistake can be cancelled while it has no forms.
export function ActiveBarrelPanel({ year, barrels, active, tasterCount }: { year: number; barrels: PanelBarrel[]; active: ActiveTasting; tasterCount: number }) {
  const router = useRouter()
  const [fillId, setFillId] = useState(() => barrels.find((barrel) => barrel.forms === 0 && barrel.fillId !== active.activeFillId)?.fillId ?? barrels[0]?.fillId ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const current = barrels.find((barrel) => barrel.fillId === active.activeFillId)
  const isOpen = canMoveOn(active)
  const isCancellable = canCancel(active, current?.forms ?? 0)

  async function run(action: () => ReturnType<typeof setActiveBarrel>): Promise<void> {
    setBusy(true)
    setError("")
    const result = await action()
    setBusy(false)
    if (result.success) router.refresh()
    else setError(result.error.message)
  }

  function cancel(): void {
    if (current && confirm(`לבטל את הבחירה בחבית ${current.number}? הטועמים לא יוכלו לדרג אותה עד שתיבחר שוב.`)) void run(() => cancelActiveBarrel({ year }))
  }

  return (
    <section className="rounded-2xl border-2 border-wine/30 bg-wine/5 p-4 space-y-3" aria-label="ניהול הטעימה">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-extrabold text-stone-900">
          {current ? (
            <>
              בטעימה עכשיו: חבית <bdi>{current.number}</bdi>
            </>
          ) : (
            "אין חבית בטעימה"
          )}
        </h2>
        {current && (
          <span className="text-base font-bold text-stone-800">
            שמרו <bdi>{active.saved.length}</bdi> מתוך <bdi>{tasterCount}</bdi>
          </span>
        )}
      </div>
      {current && active.waiting.length > 0 && <p className="text-sm font-semibold text-stone-700">ממתינים ל: {active.waiting.map((taster) => taster.username).join(", ")}</p>}
      {current && active.waiting.length === 0 && <p className="text-sm font-bold text-emerald-800">כל המשתתפים שמרו את הטופס. אפשר לעבור לחבית הבאה.</p>}
      {tasterCount === 0 && <p className="text-sm font-bold text-amber-900">יש לבחור קודם את משתתפי הטעימה, בכפתור שבמסך הבלנדינג.</p>}

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="next-barrel" className="block text-sm font-bold text-stone-800 mb-1">
            {current ? "החבית הבאה" : "החבית לטעימה"}
          </label>
          <select
            id="next-barrel"
            value={fillId}
            disabled={!isOpen || busy}
            onChange={(event) => setFillId(event.target.value)}
            className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 text-base font-bold text-stone-900 focus:border-wine focus:ring-2 focus:ring-wine/20 outline-none disabled:opacity-60"
          >
            {barrels.map((barrel) => (
              <option key={barrel.fillId} value={barrel.fillId}>
                חבית {barrel.number}
                {barrel.forms > 0 ? ` (${barrel.forms} טפסים)` : ""}
                {barrel.fillId === active.activeFillId ? " · בטעימה" : ""}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={!isOpen || busy || tasterCount === 0 || !fillId || fillId === active.activeFillId}
          onClick={() => void run(() => setActiveBarrel({ year, fillId }))}
          className="min-h-11 rounded-lg bg-wine px-5 text-base font-bold text-white hover:bg-wine-dark transition-colors disabled:opacity-50"
        >
          {busy ? "מעביר..." : "התחלת טעימה של החבית"}
        </button>
      </div>
      {!isOpen && (
        <p className="text-sm font-semibold text-stone-600">
          אפשר לבחור חבית חדשה אחרי שכל המשתתפים ישמרו את הטופס של החבית שבטעימה.
          {isCancellable && " אם החבית נבחרה בטעות, אפשר לבטל את הבחירה כל עוד לא נשמר לה אף טופס."}
        </p>
      )}
      {isCancellable && (
        <button type="button" disabled={busy} onClick={cancel} className="min-h-10 rounded-lg px-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">
          ביטול הבחירה בחבית {current?.number}
        </button>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
          {error}
        </p>
      )}
    </section>
  )
}
