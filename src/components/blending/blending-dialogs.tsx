"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  addBarrelToWine,
  createBlendWine,
  deleteBlendWine,
  setBarrelTasting,
  updateBlendWine,
} from "@/server/actions/blending-actions"
import { BarrelGlyph, LabGrid } from "@/components/blending/blending-parts"
import { formatPercent } from "@/lib/barrel-wine"
import { MAX_SCORE, MIN_SCORE } from "@/lib/blending"
import type { BarrelLab, BlendWineView, PileBarrel, WineDraw } from "@/lib/blending"
import type { Result } from "@/types"

const inputClass =
  "w-full min-h-11 border border-stone-300 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none bg-white"
const labelClass = "block text-sm font-bold text-stone-800 mb-1"

function useDialog(onClose: () => void) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  async function run(action: () => Promise<Result<unknown>>, closeAfter = true): Promise<void> {
    setBusy(true)
    setError("")
    const result = await action()
    setBusy(false)
    if (result.success) {
      if (closeAfter) onClose()
      router.refresh()
    } else {
      setError(result.error.message)
    }
  }
  return { busy, error, run }
}

function Shell({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-stone-900">{title}</h2>
            {subtitle && <p className="text-sm font-semibold text-stone-600">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="סגירה" className="h-10 w-10 rounded-full text-2xl leading-none text-stone-500 hover:bg-stone-100">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ErrorLine({ message }: { message: string }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
      {message}
    </p>
  )
}

const primaryButton = "min-h-11 rounded-lg bg-wine px-6 text-base font-bold text-white hover:bg-wine-dark transition-colors disabled:opacity-50"
const quietButton = "min-h-11 px-3 text-base font-bold text-stone-600 hover:underline"

// A barrel of the pile: its tasting, with a score from 5 to 10 and the impressions, and a way to pour it into a wine.
export function TastingDialog({
  barrel,
  wines,
  colors,
  onClose,
}: {
  barrel: PileBarrel
  wines: BlendWineView[]
  colors: Map<string, string>
  onClose: () => void
}) {
  const { busy, error, run } = useDialog(onClose)
  const [score, setScore] = useState(barrel.score === null ? "" : String(barrel.score))
  const [notes, setNotes] = useState(barrel.tastingNotes ?? "")
  const [wineId, setWineId] = useState(wines[0]?.id ?? "")
  const [liters, setLiters] = useState(String(barrel.remaining))

  return (
    <Shell title={`חבית ${barrel.number}`} subtitle={`${barrel.type} · נשארו ${barrel.remaining} ליטר`} onClose={onClose}>
      <div className="flex items-center gap-4">
        <BarrelGlyph number={barrel.number} type={barrel.type} remaining={barrel.remaining} parts={barrel.parts} colors={colors} score={barrel.score} noLab={barrel.lab.tests === 0} />
        <ul className="space-y-0.5 text-sm font-bold text-stone-800">
          {barrel.parts.map((part) => (
            <li key={part.blockId}>
              {part.blockName} · {part.variety}
              {barrel.parts.length > 1 && <span className="text-wine"> · {formatPercent(part.percent)}</span>}
            </li>
          ))}
        </ul>
      </div>

      <LabSummary lab={barrel.lab} />

      <ErrorLine message={error} />

      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          void run(() => setBarrelTasting({ fillId: barrel.fillId, score: score.trim() === "" ? null : Number(score), notes }))
        }}
      >
        <h3 className="text-base font-extrabold text-stone-900">רשמי טעימה וציון</h3>
        <div>
          <label className={labelClass} htmlFor="tasting-score">
            ציון ({MIN_SCORE} עד {MAX_SCORE})
          </label>
          <input
            id="tasting-score"
            type="number"
            inputMode="decimal"
            step="0.1"
            min={MIN_SCORE}
            max={MAX_SCORE}
            className={inputClass}
            value={score}
            onChange={(event) => setScore(event.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="tasting-notes">
            רשמי טעימה
          </label>
          <textarea id="tasting-notes" rows={4} className={inputClass} value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} />
        </div>
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? "שומר..." : "שמירה"}
        </button>
      </form>

      {wines.length > 0 && (
        <form
          className="space-y-3 border-t border-stone-200 pt-4"
          onSubmit={(event) => {
            event.preventDefault()
            void run(() => addBarrelToWine({ wineId, fillId: barrel.fillId, liters: Number(liters) }))
          }}
        >
          <h3 className="text-base font-extrabold text-stone-900">העברה ליין</h3>
          <div className="grid grid-cols-[1fr_7rem] gap-2">
            <div>
              <label className={labelClass} htmlFor="move-wine">
                יין
              </label>
              <select id="move-wine" className={inputClass} value={wineId} onChange={(event) => setWineId(event.target.value)}>
                {wines.map((wine) => (
                  <option key={wine.id} value={wine.id}>
                    {wine.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="move-liters">
                ליטרים
              </label>
              <input id="move-liters" type="number" inputMode="decimal" step="any" min={0} max={barrel.remaining} className={inputClass} value={liters} onChange={(event) => setLiters(event.target.value)} />
            </div>
          </div>
          <button type="submit" disabled={busy} className="min-h-11 rounded-lg border border-wine px-5 text-base font-bold text-wine hover:bg-wine/5 transition-colors disabled:opacity-50">
            הוספה ליין
          </button>
        </form>
      )}
    </Shell>
  )
}

// Adds liters of a barrel that is still in the pile to a wine: choose the barrel and the amount, and the amount cannot be
// more than what the barrel still holds.
export function AddAmountDialog({ wine, pile, onClose }: { wine: BlendWineView; pile: PileBarrel[]; onClose: () => void }) {
  const { busy, error, run } = useDialog(onClose)
  const [fillId, setFillId] = useState("")
  const [liters, setLiters] = useState("")
  const barrel = pile.find((candidate) => candidate.fillId === fillId)
  const amount = Number(liters)
  const tooMuch = barrel !== undefined && amount > barrel.remaining

  return (
    <Shell title={`הוספת כמות ליין "${wine.name}"`} subtitle="בוחרים חבית שעדיין לא נוצלה כולה, וכמה ליטרים לקחת ממנה" onClose={onClose}>
      <ErrorLine message={error} />
      {pile.length === 0 ? (
        <p className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-3 text-sm font-bold text-amber-900">אין חביות שנשאר בהן יין.</p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            void run(() => addBarrelToWine({ wineId: wine.id, fillId, liters: amount }))
          }}
        >
          <div>
            <label className={labelClass} htmlFor="add-barrel">
              חבית
            </label>
            <select
              id="add-barrel"
              className={inputClass}
              value={fillId}
              required
              onChange={(event) => {
                setFillId(event.target.value)
                const picked = pile.find((candidate) => candidate.fillId === event.target.value)
                setLiters(picked ? String(picked.remaining) : "")
              }}
            >
              <option value="">— בחירה —</option>
              {pile.map((candidate) => (
                <option key={candidate.fillId} value={candidate.fillId}>
                  חבית {candidate.number} · {candidate.variety} · נשארו {candidate.remaining} ליטר
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="add-liters">
              כמות בליטרים
            </label>
            <input id="add-liters" type="number" inputMode="decimal" step="any" min={0} className={inputClass} value={liters} required onChange={(event) => setLiters(event.target.value)} />
            {barrel && (
              <p className={`mt-1 text-sm font-bold ${tooMuch ? "text-red-700" : "text-stone-600"}`}>
                {tooMuch ? `אפשר לקחת עד ${barrel.remaining} ליטר מהחבית הזו` : `בחבית נשארו ${barrel.remaining} ליטר`}
              </p>
            )}
          </div>
          <button type="submit" disabled={busy || tooMuch || !fillId} className={primaryButton}>
            {busy ? "מוסיף..." : "הוספה ליין"}
          </button>
        </form>
      )}
    </Shell>
  )
}

function dayText(day: string): string {
  return day.split("-").reverse().join(".")
}

// The lab tests of a barrel as they stand: how many there are, the day of the latest, and the latest value of each measurement.
function LabSummary({ lab }: { lab: BarrelLab }) {
  return (
    <section className="space-y-2" aria-label="בדיקות מעבדה של החבית">
      <h3 className="text-base font-extrabold text-stone-900">בדיקות מעבדה</h3>
      {lab.tests === 0 ? (
        <p className="text-sm font-bold text-stone-600">אין עדיין בדיקות מעבדה לחבית הזו</p>
      ) : (
        <>
          <p className="text-sm font-semibold text-stone-600">
            {lab.tests === 1 ? "בדיקה אחת" : `${lab.tests} בדיקות`}, האחרונה ב-<bdi>{lab.latestDate ? dayText(lab.latestDate) : ""}</bdi>. מוצג הערך האחרון שנמדד בכל מדד.
          </p>
          <LabGrid lab={lab} />
        </>
      )}
    </section>
  )
}

// A barrel that is already in a wine, for reading: what it is, what it gave the wine, and its lab tests.
export function BarrelInfoDialog({ draw, wineName, colors, onClose }: { draw: WineDraw; wineName: string; colors: Map<string, string>; onClose: () => void }) {
  return (
    <Shell title={`חבית ${draw.number}`} subtitle={`${draw.type} · ${draw.liters} ליטר ביין ${wineName}`} onClose={onClose}>
      <div className="flex items-center gap-4">
        <BarrelGlyph number={draw.number} type={draw.type} remaining={225} parts={draw.parts} colors={colors} score={draw.score} noLab={draw.lab.tests === 0} />
        <ul className="space-y-0.5 text-sm font-bold text-stone-800">
          {draw.parts.map((part) => (
            <li key={part.blockId}>
              {part.blockName} · {part.variety}
              {draw.parts.length > 1 && <span className="text-wine"> · {formatPercent(part.percent)}</span>}
            </li>
          ))}
        </ul>
      </div>
      <LabSummary lab={draw.lab} />
      <button type="button" onClick={onClose} className={quietButton}>
        סגירה
      </button>
    </Shell>
  )
}

// A new wine, or the name and description of one that exists. The description is what the label is made from.
export function WineDialog({ year, wine, onClose }: { year: number; wine: BlendWineView | null; onClose: () => void }) {
  const { busy, error, run } = useDialog(onClose)
  const [name, setName] = useState(wine?.name ?? "")
  const [description, setDescription] = useState(wine?.description ?? "")

  return (
    <Shell title={wine ? "עריכת יין" : "יין חדש"} subtitle={`בלנדינג ${year}`} onClose={onClose}>
      <ErrorLine message={error} />
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          void run(() => (wine ? updateBlendWine({ id: wine.id, name, description, finalized: wine.finalized }) : createBlendWine({ year, name, description })))
        }}
      >
        <div>
          <label className={labelClass} htmlFor="wine-name">
            שם היין *
          </label>
          <input id="wine-name" className={inputClass} value={name} maxLength={80} required onChange={(event) => setName(event.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor="wine-description">
            תיאור היין, לתווית
          </label>
          <textarea id="wine-description" rows={5} className={inputClass} value={description} maxLength={2000} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? "שומר..." : "שמירה"}
          </button>
          <button type="button" onClick={onClose} className={quietButton}>
            סגירה
          </button>
          {wine && wine.draws.length === 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (confirm(`אזהרה: למחוק את המיכל "${wine.name}" לצמיתות? המיכל ריק, אבל השם והתיאור שלו יימחקו ואי אפשר יהיה לשחזר אותם.`)) void run(() => deleteBlendWine(wine.id))
              }}
              className="ms-auto min-h-11 px-2 text-sm font-bold text-red-700 hover:underline disabled:opacity-50"
            >
              מחיקת המיכל
            </button>
          )}
          {wine && wine.draws.length > 0 && <p className="ms-auto text-sm font-semibold text-stone-500">אפשר למחוק מיכל רק כשהוא ריק. קודם לוחצים על איפוס היין.</p>}
        </div>
      </form>
    </Shell>
  )
}
