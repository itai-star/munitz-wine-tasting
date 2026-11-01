"use client"

import { useRouter } from "next/navigation"

export function SalesYearSelect({ year, years }: { year: number; years: number[] }) {
  const router = useRouter()

  return (
    <label className="inline-flex items-center gap-2 text-sm font-medium text-stone-700">
      שנה
      <select
        value={year}
        onChange={(event) => router.push(`/admin/monthly-summary?year=${event.target.value}`)}
        className="border border-stone-300 rounded-lg px-3 py-2 text-base bg-white focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
      >
        {years.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}
