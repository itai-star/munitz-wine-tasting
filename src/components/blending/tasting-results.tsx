"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { deleteBarrelRatings, setRatingDecision } from "@/server/actions/barrel-rating-actions"
import { TastingResultRow } from "@/components/blending/tasting-result-row"
import { RATING_PARAMS } from "@/lib/barrel-rating"
import type { BarrelTastingView, Rater, RatingKey } from "@/lib/barrel-rating"
import type { Result } from "@/types"

// The score shown on a barrel: its final score, which is the average unless an administrator decided some parameters, rounded,
// when the viewer may see it.
export function tastingScore(tasting: BarrelTastingView): number | null {
  const score = tasting.summary?.finalTotal ?? tasting.summary?.total
  return score == null ? null : Math.round(score)
}

function names(raters: Rater[]): string {
  return raters.map((rater) => rater.username).join(", ")
}

// The tasting of a barrel: the points of each parameter of the form and the score out of 100, the ratings that stand out, who
// rated it and who has not yet. A taster who has not rated the barrel sees none of it, only the way to the tasting. An
// administrator can decide the level of any parameter instead of its average, and remove one taster's form or all of them.
export function TastingResults({ fillId, year, tasting, isAdmin }: { fillId: string; year: number; tasting: BarrelTastingView; isAdmin: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<Record<RatingKey, number | null>>>({})
  // A taster opens their own form of the barrel; otherwise the tasting screen, which shows the barrel being tasted now.
  const rateLink = tasting.ratedByMe ? `/admin/blending/tasting?year=${year}&barrel=${fillId}` : `/admin/blending/tasting?year=${year}`

  async function run(action: () => Promise<Result<void>>): Promise<boolean> {
    setBusy(true)
    setError("")
    const result = await action()
    setBusy(false)
    if (result.success) router.refresh()
    else setError(result.error.message)
    return result.success
  }

  function remove(rater: Rater | null): void {
    const question = rater ? `למחוק את הדירוג של ${rater.username} לחבית הזו?` : "למחוק את כל הדירוגים של החבית הזו, וגם את ההחלטות שלך עליה? אי אפשר לשחזר אותם."
    if (confirm(question)) void run(() => deleteBarrelRatings({ fillId, userId: rater?.userId }))
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
  const startEditing = (): void => {
    setDraft(Object.fromEntries(summary.params.map((param) => [param.key, param.decidedLevel])))
    setEditing(true)
  }
  const saveDecision = async (): Promise<void> => {
    if (await run(() => setRatingDecision({ fillId, levels: draft }))) setEditing(false)
  }
  const showRows = summary.count > 0 || summary.hasDecision || editing

  return (
    <section className="space-y-3" aria-label="טעימה">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-extrabold text-stone-900">טעימה</h3>
        <p className="text-base font-extrabold text-stone-900">
          {summary.hasDecision ? (
            <>
              ציון סופי <bdi>{summary.finalTotal ?? "—"}</bdi> מתוך 100
              {summary.total !== null && (
                <span className="text-sm font-semibold text-stone-500">
                  {" "}
                  · ממוצע <bdi>{summary.total}</bdi>
                </span>
              )}
            </>
          ) : summary.total === null ? (
            <span className="text-stone-500">עדיין אין דירוגים</span>
          ) : (
            <>
              ממוצע <bdi>{summary.total}</bdi> מתוך 100
            </>
          )}
          {summary.count > 0 && (
            <span className="text-sm font-semibold text-stone-500">
              {" "}
              · <bdi>{summary.count}</bdi> {summary.count === 1 ? "טועם" : "טועמים"}
            </span>
          )}
        </p>
      </div>
      {summary.hasDecision && !editing && <p className="text-xs font-bold text-indigo-900">פרמטרים שמסומנים &quot;הוחלט&quot; נקבעו על ידי מנהל, ואינם הממוצע.</p>}

      {showRows && (
        <ul className="space-y-2">
          {RATING_PARAMS.map((param) => {
            const row = summary.params.find((candidate) => candidate.key === param.key)
            if (!row) return null
            return (
              <TastingResultRow
                key={param.key}
                label={param.group !== param.label ? `${param.group}, ${param.label}` : param.label}
                points={param.points}
                row={row}
                editing={editing}
                draftLevel={draft[param.key] ?? null}
                onDraft={(level) => setDraft((current) => ({ ...current, [param.key]: level }))}
              />
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
                      onClick={() => remove(rater)}
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

      {editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveDecision()}
            className="min-h-10 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? "שומר..." : "שמירת ההחלטה"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="min-h-10 px-3 text-sm font-bold text-stone-600 hover:underline">
            ביטול
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {link}
          {isAdmin && (
            <button type="button" onClick={startEditing} className="min-h-10 rounded-lg border border-indigo-300 px-4 text-sm font-bold text-indigo-900 hover:bg-indigo-50">
              {summary.hasDecision ? "עריכת ההחלטה" : "החלטה ידנית על פרמטרים"}
            </button>
          )}
          {isAdmin && (summary.count > 0 || summary.hasDecision) && (
            <button type="button" disabled={busy} onClick={() => remove(null)} className="min-h-10 rounded-lg px-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">
              מחיקת כל הדירוגים
            </button>
          )}
        </div>
      )}
    </section>
  )
}
