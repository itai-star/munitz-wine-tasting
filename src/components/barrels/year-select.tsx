"use client"

import { useRouter } from "next/navigation"

// The year whose barrels are shown. A barrel is used for many years, so the page can be set to any of them.
export function YearSelect({ year, years }: { year: number; years: number[] }) {
  const router = useRouter()
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="barrel-year-filter" className="text-sm font-extrabold text-stone-700">
        שנה
      </label>
      <select
        id="barrel-year-filter"
        value={year}
        onChange={(event) => router.push(`/admin/barrels?year=${event.target.value}`)}
        className="min-h-11 rounded-lg border border-stone-300 bg-white px-3 text-base font-bold text-stone-900 focus:border-wine focus:ring-2 focus:ring-wine/20 outline-none"
      >
        {years.map((candidate) => (
          <option key={candidate} value={candidate}>
            {candidate}
          </option>
        ))}
      </select>
    </div>
  )
}
