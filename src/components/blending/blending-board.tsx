"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { addBarrelToWine, clearBlendWine, removeBarrelFromWine, updateBlendWine } from "@/server/actions/blending-actions"
import { AddAmountDialog, TastingDialog, WineDialog } from "@/components/blending/blending-dialogs"
import { BarrelGlyph, NoLabMark, TankBar } from "@/components/blending/blending-parts"
import { colorsByVariety } from "@/components/finished-wine/barrel-parts"
import { compositionOf, wineLabOf } from "@/lib/blending"
import type { BlendWineView, PileBarrel, WineLabValue } from "@/lib/blending"
import type { Result } from "@/types"

type Dialog = { kind: "tasting"; fillId: string } | { kind: "add"; wineId: string } | { kind: "wine"; wineId: string | null } | null

const smallButton = "min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-bold text-stone-800 hover:bg-stone-50 transition-colors disabled:opacity-50"

function barrelsText(count: number): string {
  return count === 1 ? "חבית אחת" : `${count} חביות`
}

function litersText(value: number): string {
  return `${value.toLocaleString("he-IL")} ליטר`
}

// A value that is worked out from the lab tests of the barrels, so it cannot be edited. When some barrels have no test for it,
// the count says how many of the barrels it was worked out from.
function LabValue({ label, unit, value, total }: { label: string; unit?: string; value: WineLabValue; total: number }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2" aria-label={`${label}, מחושב אוטומטית`}>
      <p className="text-sm font-bold text-stone-600">{label}</p>
      <p className="text-xl font-extrabold text-stone-900" aria-readonly="true">
        {value.value === null ? <span className="text-stone-400">אין נתונים</span> : <bdi>{value.value}{unit}</bdi>}
      </p>
      <p className="text-xs font-semibold text-stone-500">{total === 0 ? "מהבדיקה האחרונה של כל חבית" : value.barrels < total ? `מחושב מ-${value.barrels} חביות מתוך ${total}` : "מהבדיקה האחרונה של כל חבית"}</p>
    </div>
  )
}

function WineTank({
  wine,
  colors,
  isOver,
  busy,
  onEdit,
  onAdd,
  onRemove,
  onClear,
  onFinalize,
  dropProps,
}: {
  wine: BlendWineView
  colors: Map<string, string>
  isOver: boolean
  busy: boolean
  onEdit: () => void
  onAdd: () => void
  onRemove: (fillId: string) => void
  onClear: () => void
  onFinalize: (finalized: boolean) => void
  dropProps: React.HTMLAttributes<HTMLElement>
}) {
  const composition = compositionOf(wine.draws)
  const lab = wineLabOf(wine.draws)

  return (
    <section
      {...dropProps}
      className={`rounded-3xl border-2 bg-white p-4 sm:p-5 shadow-sm transition-colors ${
        isOver ? "border-wine bg-wine/5 ring-4 ring-wine/20" : wine.finalized ? "border-emerald-400" : "border-stone-300"
      }`}
      aria-label={`יין ${wine.name}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-2xl font-extrabold text-stone-900 break-words">{wine.name}</h3>
          {wine.description ? (
            <p className="mt-1 whitespace-pre-line text-base text-stone-700">{wine.description}</p>
          ) : (
            <p className="mt-1 text-sm font-semibold text-stone-400">אין עדיין תיאור ליין</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {wine.finalized && <span className="rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-sm font-extrabold text-emerald-900">✓ הרכב סופי</span>}
          <button type="button" onClick={onEdit} className={smallButton}>
            עריכה
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[6.5rem_1fr]">
        <div className="flex flex-col items-center gap-2">
          <p className="text-center text-2xl font-extrabold leading-none text-stone-900">
            <bdi>{composition.totalLiters.toLocaleString("he-IL")}</bdi>
            <span className="block text-sm font-bold text-stone-600">ליטר</span>
          </p>
          <TankBar shares={composition.byVariety} colors={colors} />
        </div>

        <div className="min-w-0 space-y-3">
          {composition.byVariety.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-stone-300 p-6 text-center text-base font-bold text-stone-500">
              גוררים לכאן חביות מהערימה, או לוחצים על &quot;הוספת כמות מחבית&quot;
            </p>
          ) : (
            <ul className="space-y-3">
              {composition.byVariety.map((share) => (
                <li key={share.variety}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-2 text-base font-extrabold text-stone-900">
                      <span className="h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: colors.get(share.variety) }} aria-hidden="true" />
                      {share.variety}
                    </span>
                    <span className="whitespace-nowrap text-base font-extrabold text-stone-900">
                      <bdi>{share.percent}%</bdi> · <bdi>{litersText(share.liters)}</bdi>
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-stone-600">
                    חביות: {share.barrels.map((barrel) => barrel.number).join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-2 gap-3">
            <LabValue label="אלכוהול" unit="%" value={lab.ethanol} total={lab.totalBarrels} />
            <LabValue label="pH" value={lab.ph} total={lab.totalBarrels} />
          </div>

          {wine.draws.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="החביות ביין">
              {wine.draws.map((draw) => (
                <li key={draw.fillId} className="flex items-center gap-1.5 rounded-full bg-stone-100 ps-3 pe-1 py-1 text-sm font-bold text-stone-800">
                  {draw.lab.tests === 0 && <NoLabMark />}
                  חבית <bdi>{draw.number}</bdi> · <bdi>{draw.liters}</bdi> ל׳
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`הוצאת חבית ${draw.number} מהיין`}
                    onClick={() => onRemove(draw.fillId)}
                    className="h-7 w-7 rounded-full text-lg leading-none text-stone-500 hover:bg-stone-200 hover:text-stone-900 disabled:opacity-50"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-stone-200 pt-3">
        <button type="button" onClick={onAdd} className="min-h-10 rounded-lg bg-wine px-4 text-sm font-bold text-white hover:bg-wine-dark transition-colors">
          + הוספת כמות מחבית
        </button>
        {wine.draws.length > 0 && (
          <button type="button" disabled={busy} onClick={onClear} className="min-h-10 rounded-lg px-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">
            איפוס היין
          </button>
        )}
        <label className="ms-auto flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-base font-bold text-stone-900">
          <input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={wine.finalized} disabled={busy} onChange={(event) => onFinalize(event.target.checked)} />
          הרכב סופי
        </label>
      </div>
    </section>
  )
}

export function BlendingBoard({ year, wines, pile }: { year: number; wines: BlendWineView[]; pile: PileBarrel[] }) {
  const router = useRouter()
  const [dialog, setDialog] = useState<Dialog>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [overWine, setOverWine] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const colors = colorsByVariety([...pile.map((barrel) => barrel.variety), ...wines.flatMap((wine) => wine.draws.flatMap((draw) => draw.parts.map((part) => part.variety)))])

  async function run(action: () => Promise<Result<unknown>>): Promise<void> {
    setBusy(true)
    setError("")
    const result = await action()
    setBusy(false)
    if (result.success) router.refresh()
    else setError(result.error.message)
  }

  const groups = Array.from(
    pile.reduce((byVariety, barrel) => byVariety.set(barrel.variety, [...(byVariety.get(barrel.variety) ?? []), barrel]), new Map<string, PileBarrel[]>()),
  ).sort(([, a], [, b]) => b.length - a.length)

  const closeDialog = (): void => setDialog(null)
  const tasting = dialog?.kind === "tasting" ? pile.find((barrel) => barrel.fillId === dialog.fillId) : undefined
  const adding = dialog?.kind === "add" ? wines.find((wine) => wine.id === dialog.wineId) : undefined
  const editing = dialog?.kind === "wine" && dialog.wineId ? wines.find((wine) => wine.id === dialog.wineId) ?? null : null

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold text-stone-900">היינות של בלנדינג {year}</h2>
            <button type="button" onClick={() => setDialog({ kind: "wine", wineId: null })} className="min-h-10 rounded-lg bg-wine px-4 text-sm font-bold text-white hover:bg-wine-dark transition-colors">
              + יין חדש
            </button>
          </div>

          {wines.length === 0 ? (
            <p className="rounded-3xl border-2 border-dashed border-stone-300 bg-white p-10 text-center text-lg font-bold text-stone-500">עדיין אין יינות בבלנדינג {year}. יוצרים יין, ואחר כך גוררים אליו חביות.</p>
          ) : (
            wines.map((wine) => (
              <WineTank
                key={wine.id}
                wine={wine}
                colors={colors}
                busy={busy}
                isOver={overWine === wine.id}
                onEdit={() => setDialog({ kind: "wine", wineId: wine.id })}
                onAdd={() => setDialog({ kind: "add", wineId: wine.id })}
                onRemove={(fillId) => run(() => removeBarrelFromWine({ wineId: wine.id, fillId }))}
                onClear={() => {
                  if (confirm(`לאפס את היין "${wine.name}"? כל החביות שלו יחזרו לערימה, עם כל היין שלקחו ממנו.`)) void run(() => clearBlendWine(wine.id))
                }}
                onFinalize={(finalized) => run(() => updateBlendWine({ id: wine.id, name: wine.name, description: wine.description ?? "", finalized }))}
                dropProps={{
                  onDragOver: (event) => {
                    if (dragging) {
                      event.preventDefault()
                      setOverWine(wine.id)
                    }
                  },
                  onDragLeave: () => setOverWine((current) => (current === wine.id ? null : current)),
                  onDrop: (event) => {
                    event.preventDefault()
                    const fillId = event.dataTransfer.getData("text/plain")
                    setOverWine(null)
                    setDragging(null)
                    if (fillId) void run(() => addBarrelToWine({ wineId: wine.id, fillId }))
                  },
                }}
              />
            ))
          )}
        </div>

        <aside className="space-y-4 rounded-3xl border border-stone-200 bg-stone-50 p-4" aria-label="ערימת החביות">
          <div>
            <h2 className="text-xl font-extrabold text-stone-900">חביות</h2>
            <p className="text-sm font-semibold text-stone-600">
              {barrelsText(pile.length)} עם יין, מקובצות לפי זן. גוררים חבית ליין, ולחיצה עליה פותחת טעימה וציון.
            </p>
            {pile.some((barrel) => barrel.lab.tests === 0) && (
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-stone-600">
                <NoLabMark /> חבית בלי בדיקות מעבדה
              </p>
            )}
          </div>
          {groups.length === 0 && <p className="text-base font-bold text-stone-500">כל החביות שולבו, או שלא הוזן יין לחביות של {year}.</p>}
          {groups.map(([variety, barrels]) => (
            <section key={variety} aria-label={`חביות ${variety}`}>
              <h3 className="flex items-center gap-2 text-base font-extrabold text-stone-900">
                <span className="h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: colors.get(variety) }} aria-hidden="true" />
                {variety}
                <span className="text-sm font-bold text-stone-600">
                  · {barrelsText(barrels.length)} · <bdi>{Math.round(barrels.reduce((sum, barrel) => sum + barrel.remaining, 0)).toLocaleString("he-IL")}</bdi> ל׳
                </span>
              </h3>
              <ul className="mt-2 flex flex-wrap gap-x-2 gap-y-3">
                {barrels.map((barrel) => (
                  <li key={barrel.fillId}>
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", barrel.fillId)
                        event.dataTransfer.effectAllowed = "move"
                        setDragging(barrel.fillId)
                      }}
                      onDragEnd={() => {
                        setDragging(null)
                        setOverWine(null)
                      }}
                      onClick={() => setDialog({ kind: "tasting", fillId: barrel.fillId })}
                      aria-label={`חבית ${barrel.number}, ${barrel.variety}`}
                      className={`cursor-grab rounded-lg p-1 hover:bg-white active:cursor-grabbing ${dragging === barrel.fillId ? "opacity-40" : ""}`}
                    >
                      <BarrelGlyph number={barrel.number} remaining={barrel.remaining} parts={barrel.parts} colors={colors} score={barrel.score} noLab={barrel.lab.tests === 0} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </aside>
      </div>

      {tasting && <TastingDialog key={tasting.fillId} barrel={tasting} wines={wines} colors={colors} onClose={closeDialog} />}
      {adding && <AddAmountDialog key={adding.id} wine={adding} pile={pile} onClose={closeDialog} />}
      {dialog?.kind === "wine" && (dialog.wineId === null || editing) && <WineDialog key={dialog.wineId ?? "new"} year={year} wine={editing} onClose={closeDialog} />}
    </div>
  )
}
