"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteBatch } from "@/server/actions/fermentation-actions"
import { BatchForm, type EditableBatch } from "@/components/fermentation/batch-form"
import { BatchStatusControl } from "@/components/fermentation/batch-status-control"

export function BatchControls({
  batch,
  vintageId,
  blocks,
  readingCount,
}: {
  batch: EditableBatch & { status: string }
  vintageId: string
  blocks: { id: string; name: string }[]
  readingCount: number
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  async function handleDelete() {
    const warning =
      readingCount > 0
        ? `למחוק את המיכל "${batch.tankName}"? פעולה זו תמחק גם את ${readingCount} הקריאות היומיות שנרשמו עבורו, ולא ניתן לבטל אותה.`
        : `למחוק את המיכל "${batch.tankName}"? לא ניתן לבטל פעולה זו.`
    if (!confirm(warning)) return

    setDeleting(true)
    setError("")
    const result = await deleteBatch(batch.id)
    setDeleting(false)

    if (result.success) {
      router.push("/admin/fermentation")
      router.refresh()
    } else {
      setError(result.error.message)
    }
  }

  if (editing) {
    return (
      <div className="space-y-3">
        <BatchForm vintageId={vintageId} blocks={blocks} editingBatch={batch} />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-sm px-4 py-2 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-50 transition-colors"
        >
          ביטול
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <BatchStatusControl batchId={batch.id} status={batch.status} />
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-sm border border-stone-300 text-stone-700 px-4 py-2 rounded-lg hover:bg-stone-50 transition-colors"
      >
        ערוך מיכל
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="text-sm text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        {deleting ? "מוחק..." : "מחק מיכל"}
      </button>
      {error && <span className="text-red-600 text-xs">{error}</span>}
    </div>
  )
}
