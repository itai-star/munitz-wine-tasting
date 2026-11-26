"use client"

import { useState } from "react"
import { RatersPopup, totalFlagText } from "@/components/blending-tasting/raters-popup"
import { colorsByVariety } from "@/components/finished-wine/barrel-parts"
import { OUTLIER_TOTAL_GAP } from "@/lib/barrel-rating"
import type { BarrelTastingView } from "@/lib/barrel-rating"

export type ResultRow = {
  fillId: string
  number: string
  type: string
  // The year of the barrel itself, not of the wine it holds.
  year: number
  variety: string
  composition: string
  tasting: BarrelTastingView
  // What is still in the barrel, and the wines of the blending it was poured into.
  remaining: number
  wines: string[]
}

type SortKey = "number" | "final" | "average" | "tasters" | "flags" | "variety"

// The number of parameters with a rating that stands out.
function flagCount(row: ResultRow): number {
  return row.tasting.summary?.params.filter((param) => param.flags.length > 0).length ?? 0
}

// How many notes the tasters wrote on a barrel: notes on parameters and the general notes of the forms.
function noteCount(row: ResultRow): number {
  return row.tasting.forms.reduce((sum, form) => sum + Object.keys(form.notes).length + (form.general ? 1 : 0), 0)
}

function finalOf(row: ResultRow): number | null {
  return row.tasting.summary?.finalTotal ?? row.tasting.summary?.total ?? null
}

// A barrel the viewer may not see yet sorts after the others, whatever the direction.
function compare(a: ResultRow, b: ResultRow, key: SortKey): number {
  const byNumber = a.number.localeCompare(b.number, "he", { numeric: true })
  const numeric = (pick: (row: ResultRow) => number | null): number => {
    const x = pick(a)
    const y = pick(b)
    if (x === null && y === null) return byNumber
    if (x === null) return 1
    if (y === null) return -1
    return y - x || byNumber
  }
  switch (key) {
    case "final":
      return numeric(finalOf)
    case "average":
      return numeric((row) => row.tasting.summary?.total ?? null)
    case "tasters":
      return numeric((row) => (row.tasting.visible ? (row.tasting.summary?.count ?? 0) : null))
    case "flags":
      // Barrels where a whole score stands out come first, then those with more parameters that do.
      return numeric((row) => (row.tasting.visible ? ((row.tasting.summary?.totalFlags.length ?? 0) > 0 ? 100 : 0) + flagCount(row) : null))
    case "variety":
      return a.variety.localeCompare(b.variety, "he") || byNumber
    default:
      return byNumber
  }
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "number", label: "חבית" },
  { key: "variety", label: "זן" },
  { key: "final", label: "ציון סופי" },
  { key: "average", label: "ממוצע" },
  { key: "tasters", label: "טועמים" },
  { key: "flags", label: "חריגים בפרמטרים" },
]

// The barrels of a year with their tasting, sortable by any of the figures and filtered by variety. The best barrels come first
// when sorting by score. A barrel whose results the viewer may not see yet says so.
export function ResultsTable({ rows, tasterCount }: { rows: ResultRow[]; tasterCount: number }) {
  const [sortKey, setSortKey] = useState<SortKey>("final")
  const [variety, setVariety] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const detail = rows.find((row) => row.fillId === detailId && row.tasting.visible)
  const colors = colorsByVariety(rows.map((row) => row.variety))
  const varieties = Array.from(new Set(rows.map((row) => row.variety))).sort((a, b) => a.localeCompare(b, "he"))
  const visible = rows.filter((row) => variety === null || row.variety === variety).sort((a, b) => compare(a, b, sortKey))
  const chip = "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 text-sm font-bold transition-colors"

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="סינון לפי זן">
        <button type="button" aria-pressed={variety === null} onClick={() => setVariety(null)} className={`${chip} ${variety === null ? "border-wine bg-wine text-white" : "border-stone-300 bg-white text-stone-700"}`}>
          כל הזנים ({rows.length})
        </button>
        {varieties.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={variety === name}
            onClick={() => setVariety(name)}
            className={`${chip} ${variety === name ? "border-wine bg-wine text-white" : "border-stone-300 bg-white text-stone-700"}`}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.get(name) }} aria-hidden="true" />
            {name} ({rows.filter((row) => row.variety === name).length})
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="bg-stone-50">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column.key} scope="col" className="px-3 py-2 text-start" aria-sort={sortKey === column.key ? (column.key === "number" || column.key === "variety" ? "ascending" : "descending") : undefined}>
                  <button type="button" onClick={() => setSortKey(column.key)} className={`font-extrabold hover:text-wine ${sortKey === column.key ? "text-wine underline underline-offset-4" : "text-stone-700"}`}>
                    {column.label}
                  </button>
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-start font-extrabold text-stone-700">
                מצב החבית
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const summary = row.tasting.visible ? row.tasting.summary : null
              const flags = flagCount(row)
              return (
                <tr key={row.fillId} className="border-t border-stone-100">
                  <td className="px-3 py-2.5">
                    <span className="text-base font-extrabold text-stone-900">
                      <bdi>{row.number}</bdi>
                    </span>
                    <span className="block text-xs font-semibold text-stone-500">
                      {row.type} · שנת חבית <bdi>{row.year}</bdi>
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5 font-bold text-stone-800">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.get(row.variety) }} aria-hidden="true" />
                      {row.composition}
                    </span>
                  </td>
                  {summary ? (
                    <>
                      <td className="px-3 py-2.5">
                        <span className="text-lg font-extrabold text-stone-900">
                          <bdi>{finalOf(row) ?? "—"}</bdi>
                        </span>
                        {summary.hasDecision && <span className="ms-1.5 rounded-full bg-indigo-100 px-1.5 py-px text-[11px] font-extrabold text-indigo-900">הוחלט</span>}
                        {summary.totalFlags.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setDetailId(row.fillId)}
                            title={summary.totalFlags.map(totalFlagText).join(" · ")}
                            className="ms-1.5 rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-extrabold text-stone-900 hover:bg-amber-400"
                          >
                            ! {summary.totalFlags[0].kind === "gap" ? "פער בציון" : "ציון חריג"}
                          </button>
                        )}
                        {summary.count > 0 && (
                          <button
                            type="button"
                            onClick={() => setDetailId(row.fillId)}
                            className="mt-1 flex min-h-9 items-center whitespace-nowrap rounded-lg border border-stone-300 bg-white px-2.5 text-xs font-bold text-stone-800 hover:bg-stone-50"
                          >
                            פירוט טועמים{noteCount(row) > 0 ? ` · ${noteCount(row)} הערות` : ""}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-stone-700">
                        <bdi>{summary.total ?? "—"}</bdi>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-stone-700">
                        <bdi>{summary.count}</bdi>
                        {tasterCount > 0 && <span className="text-stone-400"> / {tasterCount}</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {flags > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-extrabold text-amber-900">
                            ! <bdi>{flags}</bdi> {flags === 1 ? "פרמטר" : "פרמטרים"}
                          </span>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                    </>
                  ) : (
                    <td colSpan={4} className="px-3 py-2.5 text-sm font-semibold text-stone-500">
                      התוצאות יוצגו אחרי שתדרג את החבית
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-sm font-semibold text-stone-700">
                    {row.wines.length > 0 && <span className="block">ביין: {row.wines.join(", ")}</span>}
                    {row.remaining > 0 ? (
                      <span className={row.wines.length > 0 ? "text-stone-500" : ""}>
                        נשארו <bdi>{row.remaining}</bdi> ליטר
                      </span>
                    ) : (
                      row.wines.length === 0 && <span className="text-stone-400">ריקה</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs font-semibold text-stone-500">
        לחיצה על כותרת של עמודה ממיינת לפיה. בציון, בטועמים ובחריגים הגבוה ראשון. ציון סופי כולל את החלטות המנהל, כשיש. ציון חריג הוא ציון כולל של טועם שרחוק ב-{OUTLIER_TOTAL_GAP} נקודות או יותר מממוצע שאר הטועמים. עם שני טועמים, פער כזה ביניהם מסומן כפער.
      </p>
      {detail?.tasting.summary && <RatersPopup number={detail.number} summary={detail.tasting.summary} forms={detail.tasting.forms} onClose={() => setDetailId(null)} />}
    </div>
  )
}
