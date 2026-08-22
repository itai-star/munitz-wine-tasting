"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"

type Vintage = { year: number; label: string }

export function VintageSelect({
  vintages,
  selectedYear,
}: {
  vintages: Vintage[]
  selectedYear: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("vintage", e.target.value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-stone-600">עונה:</span>
      <select
        value={String(selectedYear)}
        onChange={handleChange}
        className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
      >
        {vintages.map((v) => (
          <option key={v.year} value={String(v.year)}>
            {v.label}
          </option>
        ))}
      </select>
    </label>
  )
}
