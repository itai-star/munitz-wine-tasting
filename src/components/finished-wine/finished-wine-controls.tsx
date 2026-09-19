"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteFinishedWine } from "@/server/actions/finished-wine-actions"
import { FinishedWineForm, type EditableFinishedWine } from "@/components/finished-wine/finished-wine-form"

export function FinishedWineControls({
  wine,
  vintages,
  blocks,
}: {
  wine: EditableFinishedWine
  vintages: { id: string; label: string }[]
  blocks: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  async function handleDelete() {
    if (!confirm(`למחוק את רשומת היין המוכן של מכל "${wine.tank}"? לא ניתן לבטל פעולה זו.`)) return

    setDeleting(true)
    setError("")
    const result = await deleteFinishedWine(wine.id)
    setDeleting(false)

    if (result.success) {
      router.push("/admin/finished-wine")
      router.refresh()
    } else {
      setError(result.error.message)
    }
  }

  if (editing) {
    return (
      <div className="space-y-3">
        <FinishedWineForm
          vintageId={wine.vintageId}
          vintages={vintages}
          blocks={blocks}
          editingWine={wine}
        />
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
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-sm border border-stone-300 text-stone-700 px-4 py-2 rounded-lg hover:bg-stone-50 transition-colors"
      >
        ערוך רשומה
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="text-sm text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        {deleting ? "מוחק..." : "מחק רשומה"}
      </button>
      {error && <span className="text-red-600 text-xs">{error}</span>}
    </div>
  )
}
