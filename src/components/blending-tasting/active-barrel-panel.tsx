"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cancelActiveBarrel, deleteBarrelRatings, setActiveBarrel } from "@/server/actions/barrel-rating-actions"
import { canCancel, canMoveOn } from "@/lib/barrel-rating"
import type { ActiveTasting } from "@/lib/barrel-rating"

type PanelBarrel = { fillId: string; number: string; forms: number }

// For an administrator: the barrel being tasted now, who saved a form for it and who has not, and the choice of the next
// barrel, which opens once every taster saved theirs. A barrel chosen by mistake can be cancelled while it has no forms, and the
// tasting of a barrel that already has results can be reset, which lets it be chosen again.
export function ActiveBarrelPanel({ year, barrels, active, tasterCount }: { year: number; barrels: PanelBarrel[]; active: ActiveTasting; tasterCount: number }) {
  const router = useRouter()
  const [fillId, setFillId] = useState(() => barrels.find((barrel) => barrel.forms === 0 && barrel.fillId !== active.activeFillId)?.fillId ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const current = barrels.find((barrel) => barrel.fillId === active.activeFillId)
  const isOpen = canMoveOn(active)
  const isCancellable = canCancel(active, current?.forms ?? 0)
  const selectedForms = barrels.find((barrel) => barrel.fillId === fillId)?.forms ?? 0

  async function run(action: () => ReturnType<typeof setActiveBarrel>): Promise<void> {
    setBusy(true)
    setError("")
    const result = await action()
    setBusy(false)
    if (result.success) router.refresh()
    else setError(result.error.message)
  }

  const tasted = barrels.filter((barrel) => barrel.forms > 0)

  function reset(barrel: PanelBarrel): void {
    if (confirm(`לאפס את הטעימה של חבית ${barrel.number}? כל הטפסים וההחלטות של המנהל על החבית יימחקו ואי אפשר לשחזר אותם. אחרי האיפוס אפשר לבחור אותה שוב לטעימה.`)) {
      void run(() => deleteBarrelRatings({ fillId: barrel.fillId }))
    }
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
              <option key={barrel.fillId} value={barrel.fillId} disabled={barrel.forms > 0}>
                חבית {barrel.number}
                {barrel.fillId === active.activeFillId ? " · בטעימה" : barrel.forms > 0 ? ` · נטעמה (${barrel.forms} טפסים), יש לאפס` : ""}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={!isOpen || busy || tasterCount === 0 || !fillId || fillId === active.activeFillId || selectedForms > 0}
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
      {tasted.length > 0 && (
        <details className="rounded-xl border border-stone-200 bg-white px-3 py-2">
          <summary className="cursor-pointer text-sm font-extrabold text-stone-800">חביות שנטעמו ({tasted.length}), איפוס תוצאות</summary>
          <p className="mt-2 text-sm font-semibold text-stone-600">איפוס מוחק את הטפסים של כל הטועמים ואת ההחלטות שלך על החבית, ואז אפשר לבחור אותה שוב לטעימה.</p>
          <ul className="mt-2 space-y-1">
            {tasted.map((barrel) => (
              <li key={barrel.fillId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-bold text-stone-900">
                  חבית <bdi>{barrel.number}</bdi>
                  <span className="font-semibold text-stone-500">
                    {" "}
                    · <bdi>{barrel.forms}</bdi> {barrel.forms === 1 ? "טופס" : "טפסים"}
                  </span>
                </span>
                <button type="button" disabled={busy} onClick={() => reset(barrel)} className="min-h-10 rounded-lg px-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">
                  איפוס התוצאות
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
          {error}
        </p>
      )}
    </section>
  )
}
