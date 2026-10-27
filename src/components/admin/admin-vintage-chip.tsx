"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { showsVintage } from "@/components/admin/admin-areas"

type Vintage = { year: number; label: string }

// One vintage selector for the whole harvest area. Pages read the choice from ?vintage=.
export function AdminVintageChip({ vintages }: { vintages: Vintage[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  if (vintages.length === 0 || !showsVintage(pathname)) return null

  if (vintages.length === 1) {
    return (
      <span className="inline-flex items-center rounded-full bg-white/15 text-white text-sm font-medium px-3 py-1.5">
        {vintages[0].label}
      </span>
    )
  }

  const requested = searchParams.get("vintage")
  const selected = vintages.some((v) => String(v.year) === requested)
    ? String(requested)
    : String(vintages[0].year)

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("vintage", event.target.value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <label className="relative inline-flex items-center rounded-full bg-white/15 hover:bg-white/20 transition-colors">
      <span className="sr-only">בציר</span>
      <select
        value={selected}
        onChange={handleChange}
        className="appearance-none bg-transparent text-white text-sm font-medium ps-3 pe-7 py-1.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/60 cursor-pointer"
      >
        {vintages.map((v) => (
          <option key={v.year} value={String(v.year)} className="text-stone-800">
            {v.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute end-2 w-3.5 h-3.5 text-white/80"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  )
}
