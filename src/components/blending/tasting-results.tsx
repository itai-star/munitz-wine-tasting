"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { deleteBarrelRatings } from "@/server/actions/barrel-rating-actions"
import { RATING_PARAMS } from "@/lib/barrel-rating"
import type { BarrelTastingView, Rater } from "@/lib/barrel-rating"

// The score shown on a barrel: the average of its tasting forms, rounded, when the viewer may see it.
export function tastingScore(tasting: BarrelTastingView): number | null {
  const total = tasting.summary?.total
  return total == null ? null : Math.round(total)
}

function names(raters: Rater[]): string {
  return raters.map((rater) => rater.username).join(", ")
}

// The tasting of a barrel: the average points of each parameter of the form and the average score out of 100, who rated it and
// who has not yet. A taster who has not rated the barrel sees none of it, only the way to rate it. An administrator can remove
// one taster's form, or all of them.
export function TastingResults({ fillId, year, tasting, isAdmin }: { fillId: string; year: number; tasting: BarrelTastingView; isAdmin: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  // A taster opens their own form of the barrel; otherwise the tasting screen, which shows the barrel being tasted now.
  const rateLink = tasting.ratedByMe ? `/admin/blending/tasting?year=${year}&barrel=${fillId}` : `/admin/blending/tasting?year=${year}`

  async function remove(rater: Rater | null): Promise<void> {
    const question = rater ? `למחוק את הדירוג של ${rater.username} לחבית הזו?` : "למחוק את כל הדירוגים של החבית הזו? אי אפשר לשחזר אותם."
    if (!confirm(question)) return
    setBusy(true)
    setError("")
    const result = await deleteBarrelRatings({ fillId, userId: rater?.userId })
    setBusy(false)
    if (result.success) router.refresh()
    else setError(result.error.message)
  }

  const link = (
    <Link href={rateLink} className="inline-flex min-h-10 items-center rounded-lg border border-wine px-4 text-sm font-bold text-wine hover:bg-wine/5">
      {tasting.ratedByMe ? "עריכת הדירוג שלי" : "לטופס הטעימה"}
    </Link>
  )

  if (!tasting.visible || !tasting.summary) {
    return (
      <section className="space-y-2" aria-label="טעימה">
        <h3 className="text-base font-extrabold text-stone-900">טעימה</h3>
        <p className="text-sm font-semibold text-stone-600">התוצאות של החבית יוצגו אחרי שתדרג אותה, כדי שהדירוגים של האחרים לא ישפיעו עליך. מדרגים חבית כשהיא בטעימה.</p>
        {link}
      </section>
    )
  }

  const summary = tasting.summary
  return (
    <section className="space-y-3" aria-label="טעימה">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-extrabold text-stone-900">טעימה</h3>
        <p className="text-base font-extrabold text-stone-900">
          {summary.total === null ? (
            <span className="text-stone-500">עדיין אין דירוגים</span>
          ) : (
            <>
              ממוצע <bdi>{summary.total}</bdi> מתוך 100 · <bdi>{summary.count}</bdi> {summary.count === 1 ? "טועם" : "טועמים"}
            </>
          )}
        </p>
      </div>

      {summary.count > 0 && (
        <ul className="space-y-1.5">
          {RATING_PARAMS.map((param) => {
            const row = summary.params.find((candidate) => candidate.key === param.key)
            const average = row?.average ?? 0
            const lowest = param.points[0]
            const share = row ? Math.max(0, Math.min(100, ((average - lowest) / (row.max - lowest)) * 100)) : 0
            return (
              <li key={param.key} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-2 text-sm">
                <span className="font-semibold text-stone-700">
                  {param.group !== param.label && <span className="text-stone-500">{param.group}, </span>}
                  {param.label}
                </span>
                <span className="h-2 rounded-full bg-stone-100 overflow-hidden" aria-hidden="true">
                  <span className="block h-full rounded-full bg-wine" style={{ width: `${share}%` }} />
                </span>
                <span className="whitespace-nowrap font-extrabold text-stone-900">
                  <bdi>{average}</bdi>
                  <span className="font-semibold text-stone-500"> / {row?.max}</span>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <div className="space-y-1 text-sm">
        {tasting.raters.length > 0 && (
          <p className="font-semibold text-stone-700">
            דירגו:{" "}
            {isAdmin
              ? tasting.raters.map((rater, index) => (
                  <span key={rater.userId} className="whitespace-nowrap">
                    {index > 0 && ", "}
                    {rater.username}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(rater)}
                      aria-label={`מחיקת הדירוג של ${rater.username}`}
                      className="ms-0.5 rounded px-1 text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      ×
                    </button>
                  </span>
                ))
              : names(tasting.raters)}
          </p>
        )}
        {tasting.pending.length > 0 && <p className="font-semibold text-stone-500">עוד לא דירגו: {names(tasting.pending)}</p>}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {link}
        {isAdmin && summary.count > 0 && (
          <button type="button" disabled={busy} onClick={() => void remove(null)} className="min-h-10 rounded-lg px-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">
            מחיקת כל הדירוגים
          </button>
        )}
      </div>
    </section>
  )
}
