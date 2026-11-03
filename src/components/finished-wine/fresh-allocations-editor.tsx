"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteFreshAllocation, setFreshAllocation } from "@/server/actions/fresh-allocation-actions"
import type { Result } from "@/types"

export type FreshEntry = { id: string; variety: string; liters: number }

export type FreshVariety = { variety: string; forecastLiters: number }

const inputClass = "min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-base focus:border-wine focus:ring-2 focus:ring-wine/20 outline-none"
const smallButton = "min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-bold text-stone-800 hover:bg-stone-50 transition-colors disabled:opacity-50"

function litersText(value: number): string {
  return `${value.toLocaleString("he-IL")} ליטר`
}

// Fresh wine that is set aside by hand: for a variety, the liters that are bottled as fresh and need no barrel.
export function FreshAllocationsEditor({
  vintageId,
  varieties,
  entries,
  freshTankLiters,
  freshManualLiters,
}: {
  vintageId: string
  varieties: FreshVariety[]
  entries: FreshEntry[]
  freshTankLiters: number
  freshManualLiters: number
}) {
  const router = useRouter()
  const [variety, setVariety] = useState("")
  const [liters, setLiters] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  const forecastOf = new Map(varieties.map((entry) => [entry.variety, entry.forecastLiters]))

  async function run(action: () => Promise<Result<unknown>>, done?: () => void): Promise<void> {
    setBusy(true)
    setMessage("")
    const result = await action()
    setBusy(false)
    if (result.success) {
      done?.()
      router.refresh()
    } else {
      setMessage(result.error.message)
    }
  }

  function save(event: React.FormEvent): void {
    event.preventDefault()
    void run(
      () => setFreshAllocation({ vintageId, variety, liters: Number(liters) }),
      () => {
        setVariety("")
        setLiters("")
      },
    )
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
      <h4 className="text-lg font-extrabold text-stone-900">רענן, הגדרה ידנית</h4>
      <p className="mt-1 text-sm text-stone-600">
        ליטרים שמוגדרים כרענן לא נכנסים לחביות. בוחרים זן וכמה ליטרים ממנו הם רענן, והחביות של הזן מחושבות רק על מה שנשאר.
      </p>
      <p className="mt-2 text-sm font-bold text-stone-800">
        רענן ממכלים שסומנו רענן: <bdi>{litersText(freshTankLiters)}</bdi> · רענן ידני: <bdi>{litersText(freshManualLiters)}</bdi> · סך הכול:{" "}
        <bdi>{litersText(freshTankLiters + freshManualLiters)}</bdi>
      </p>

      {message && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
          {message}
        </p>
      )}

      <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <div>
          <label htmlFor="fresh-variety" className="mb-1 block text-sm font-bold text-stone-800">
            זן
          </label>
          <select id="fresh-variety" className={inputClass} value={variety} onChange={(event) => setVariety(event.target.value)} required>
            <option value="">— בחירה —</option>
            {varieties.map((entry) => (
              <option key={entry.variety} value={entry.variety}>
                {entry.variety} (צפי {entry.forecastLiters.toLocaleString("he-IL")} ליטר)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="fresh-liters" className="mb-1 block text-sm font-bold text-stone-800">
            ליטרים לרענן
          </label>
          <input
            id="fresh-liters"
            type="number"
            inputMode="numeric"
            min={1}
            className={inputClass}
            value={liters}
            onChange={(event) => setLiters(event.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 rounded-lg bg-wine px-5 text-base font-bold text-white hover:bg-wine-dark transition-colors disabled:opacity-50"
        >
          {busy ? "שומר..." : "שמירה"}
        </button>
      </form>

      {entries.length > 0 && (
        <ul className="mt-4 space-y-2">
          {entries.map((entry) => {
            const forecast = forecastOf.get(entry.variety)
            return (
              <li key={entry.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-stone-200 p-3">
                <span className="text-base font-bold text-stone-900">{entry.variety}</span>
                <span className="text-base font-extrabold text-stone-900">
                  <bdi>{litersText(entry.liters)}</bdi>
                </span>
                {forecast === undefined && <span className="text-sm font-bold text-amber-800">אין יין אדום מהזן הזה בבציר</span>}
                {forecast !== undefined && entry.liters > forecast && (
                  <span className="text-sm font-bold text-amber-800">גבוה מהצפי, מחושבים {litersText(forecast)}</span>
                )}
                <span className="ms-auto flex gap-2">
                  <button
                    type="button"
                    className={smallButton}
                    onClick={() => {
                      setVariety(entry.variety)
                      setLiters(String(entry.liters))
                    }}
                  >
                    עריכה
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="min-h-10 px-2 text-sm font-bold text-red-700 hover:underline disabled:opacity-50"
                    onClick={() => {
                      if (confirm(`להסיר את הרענן של ${entry.variety}?`)) void run(() => deleteFreshAllocation(entry.id))
                    }}
                  >
                    הסרה
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
