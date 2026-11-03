"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { removeBarrelFromStock } from "@/server/actions/barrel-actions"
import { useBarrelEditor } from "@/components/barrels/barrel-editor"
import { formatPercent } from "@/lib/barrel-wine"
import type { BarrelTestRow, BarrelYearRow } from "@/lib/barrel-room"

type Filter = "all" | "withWine" | "noWine" | "left"

const chip = "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-bold transition-colors"

function dayText(day: string): string {
  return day.split("-").reverse().join(".")
}

function StatePill({ row }: { row: BarrelYearRow }) {
  if (row.state === "IN_STOCK") {
    return <span className="shrink-0 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-xs font-extrabold text-emerald-900">בחדר</span>
  }
  const label = row.state === "REMOVED_THIS_YEAR" ? "הוצאה בשנה זו" : "הוצאה מאוחר יותר"
  return <span className="shrink-0 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs font-extrabold text-amber-900">{label}</span>
}

function latestTestText(test: BarrelTestRow): string {
  const values = [
    test.ph !== null && `pH ${test.ph}`,
    test.ethanol !== null && `Ethanol ${test.ethanol}`,
    test.totalAcid !== null && `Total Acid ${test.totalAcid}`,
    test.volatile !== null && `Volatile ${test.volatile}`,
  ].filter((value): value is string => value !== false)
  return `${dayText(test.testDate)}${values.length > 0 ? ` · ${values.join(" · ")}` : ""}`
}

export function BarrelsList({ rows, year }: { rows: BarrelYearRow[]; year: number }) {
  const router = useRouter()
  const { openEdit, openWine, openTests } = useBarrelEditor()
  const [filter, setFilter] = useState<Filter>("all")
  const [search, setSearch] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const counts: Record<Filter, number> = {
    all: rows.length,
    withWine: rows.filter((row) => row.parts.length > 0).length,
    noWine: rows.filter((row) => row.parts.length === 0).length,
    left: rows.filter((row) => row.state !== "IN_STOCK").length,
  }
  const visible = useMemo(() => {
    const text = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (filter === "withWine" && row.parts.length === 0) return false
      if (filter === "noWine" && row.parts.length > 0) return false
      if (filter === "left" && row.state === "IN_STOCK") return false
      const haystack = [row.number, row.type, row.year, ...row.parts.flatMap((part) => [part.blockName, part.variety])].join(" ").toLowerCase()
      return text === "" || haystack.includes(text)
    })
  }, [rows, filter, search])

  async function remove(row: BarrelYearRow): Promise<void> {
    if (!confirm(`להוציא את חבית ${row.number} מהמלאי? אפשר להחזיר אותה אחר כך.`)) return
    setBusyId(row.id)
    setError("")
    const result = await removeBarrelFromStock({ id: row.id, note: "" })
    setBusyId(null)
    if (result.success) router.refresh()
    else setError(result.error.message)
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "הכול" },
    { key: "withWine", label: "עם יין" },
    { key: "noWine", label: "בלי יין" },
    { key: "left", label: "הוצאו מהמלאי" },
  ]

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={`${chip} ${filter === key ? "border-wine bg-wine text-white" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"}`}
          >
            {label}
            <span className={`rounded-full px-1.5 text-xs font-extrabold ${filter === key ? "bg-white/25" : "bg-stone-200 text-stone-800"}`}>{counts[key]}</span>
          </button>
        ))}
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="חיפוש לפי מספר, כרם, זן או סוג"
          aria-label="חיפוש חבית"
          className="min-h-10 min-w-0 flex-1 basis-48 rounded-lg border border-stone-300 bg-white px-3 text-base"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-base text-stone-500">
          {rows.length === 0 ? `אין חביות שהיו בשימוש בשנה ${year}.` : "אין חביות שמתאימות לחיפוש."}
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((row) => {
            const latest = row.tests.length > 0 ? row.tests[row.tests.length - 1] : null
            return (
              <li key={row.id} className="flex flex-col rounded-xl border border-stone-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-extrabold text-stone-900">
                      חבית <bdi>{row.number}</bdi>
                    </p>
                    <p className="text-sm font-semibold text-stone-600 break-words">
                      {row.type} · שנת חבית <bdi>{row.year}</bdi>
                    </p>
                  </div>
                  <StatePill row={row} />
                </div>
                {row.state !== "IN_STOCK" && row.removedOn && (
                  <p className="mt-1 text-sm font-semibold text-amber-900">
                    הוצאה מהמלאי ב-<bdi>{dayText(row.removedOn)}</bdi>
                    {row.removalNote ? `: ${row.removalNote}` : ""}
                  </p>
                )}

                <div className="mt-3 flex-1 rounded-lg bg-stone-50 p-2.5">
                  {row.parts.length === 0 ? (
                    <p className="text-sm font-semibold text-stone-500">לא הוזן יין לשנה {year}</p>
                  ) : (
                    <ul className="space-y-1">
                      {row.parts.map((part) => (
                        <li key={part.blockId} className="flex items-baseline justify-between gap-3 text-base">
                          <span className="min-w-0 break-words">
                            <span className="font-extrabold text-stone-900">{part.blockName}</span>
                            <span className="font-semibold text-stone-600"> · {part.variety}</span>
                          </span>
                          {row.parts.length > 1 && (
                            <span className="font-extrabold text-wine whitespace-nowrap">
                              <bdi>{formatPercent(part.percent)}</bdi>
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <p className="mt-2 text-sm font-semibold text-stone-700">
                  {latest ? (
                    <>
                      <bdi>{row.tests.length}</bdi> בדיקות · אחרונה: <bdi>{latestTestText(latest)}</bdi>
                    </>
                  ) : (
                    "אין בדיקות מעבדה"
                  )}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => openWine(row.id)} className="min-h-10 rounded-lg bg-wine px-4 text-sm font-bold text-white hover:bg-wine-dark transition-colors">
                    עדכון יין
                  </button>
                  <button type="button" onClick={() => openTests(row.id)} className="min-h-10 rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50">
                    בדיקות ({row.tests.length})
                  </button>
                  <button type="button" onClick={() => openEdit(row)} className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-bold text-stone-800 hover:bg-stone-50">
                    עריכה
                  </button>
                  {row.state === "IN_STOCK" && (
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => remove(row)}
                      className="min-h-10 rounded-lg px-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      הוצאה מהמלאי
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
