"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { setBarrelYearFlag } from "@/server/actions/barrel-flag-actions"

// The two marks of a barrel in a year. "Include in the bottles and corks" is on unless switched off, for a barrel whose wine is
// not bottled with the winery's own bottles and corks. "Last round" is off unless switched on, for a barrel that is about to
// leave the stock and so should not be counted as one the next year can use.
export function BarrelFlagToggles({
  barrelId,
  year,
  includeInBottling,
  lastRound,
  disabled = false,
}: {
  barrelId: string
  year: number
  includeInBottling: boolean
  lastRound: boolean
  disabled?: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function change(flags: { includeInBottling?: boolean; lastRound?: boolean }): Promise<void> {
    setBusy(true)
    setError("")
    const result = await setBarrelYearFlag({ barrelId, year, ...flags })
    setBusy(false)
    if (result.success) router.refresh()
    else setError(result.error.message)
  }

  const box = "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-1 text-sm font-bold text-stone-800"
  return (
    <div className="space-y-0.5">
      <label className={box}>
        <input
          type="checkbox"
          className="h-5 w-5 accent-emerald-600"
          checked={includeInBottling}
          disabled={busy || disabled}
          onChange={(event) => void change({ includeInBottling: event.target.checked })}
        />
        תכלול בחישוב בקבוקים ופקקים
      </label>
      <label className={box}>
        <input
          type="checkbox"
          className="h-5 w-5 accent-amber-600"
          checked={lastRound}
          disabled={busy || disabled}
          onChange={(event) => void change({ lastRound: event.target.checked })}
        />
        סבב אחרון
      </label>
      {error && (
        <p role="alert" className="text-xs font-bold text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
