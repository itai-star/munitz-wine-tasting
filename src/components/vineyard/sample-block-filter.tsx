"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"

export function SampleBlockFilter({
  blocks,
  selectedBlockIds,
}: {
  blocks: { id: string; name: string }[]
  selectedBlockIds: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isAll = selectedBlockIds.length === 0

  function updateSelection(ids: string[]) {
    const params = new URLSearchParams(searchParams.toString())
    if (ids.length === 0) {
      params.delete("blocks")
    } else {
      params.set("blocks", ids.join(","))
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  function toggleBlock(id: string) {
    const next = selectedBlockIds.includes(id)
      ? selectedBlockIds.filter((x) => x !== id)
      : [...selectedBlockIds, id]
    updateSelection(next)
  }

  const chipClass = (active: boolean) =>
    `text-sm px-3 py-1.5 rounded-full border transition-colors ${
      active
        ? "bg-wine text-white border-wine"
        : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
    }`

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-stone-600">כרם:</span>
      <button type="button" onClick={() => updateSelection([])} className={chipClass(isAll)}>
        כל הכרמים
      </button>
      {blocks.map((block) => (
        <button
          key={block.id}
          type="button"
          onClick={() => toggleBlock(block.id)}
          className={chipClass(selectedBlockIds.includes(block.id))}
        >
          {block.name}
        </button>
      ))}
    </div>
  )
}
