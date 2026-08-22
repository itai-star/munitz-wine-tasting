"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"

export function SampleBlockFilter({
  blocks,
  selectedBlockId,
}: {
  blocks: { id: string; name: string }[]
  selectedBlockId: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value) {
      params.set("block", e.target.value)
    } else {
      params.delete("block")
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-stone-600">כרם:</span>
      <select
        value={selectedBlockId}
        onChange={handleChange}
        className="border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
      >
        <option value="">כל הכרמים</option>
        {blocks.map((block) => (
          <option key={block.id} value={block.id}>
            {block.name}
          </option>
        ))}
      </select>
    </label>
  )
}
