"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { GrowerFields, primaryButtonClass, secondaryButtonClass, toNullable } from "@/components/growers/grower-fields"
import type { GrowerDraft } from "@/components/growers/grower-fields"
import { formatShekels } from "@/lib/credit"
import { deleteGrower, updateGrower } from "@/server/actions/grower-actions"
import type { GrowerRow } from "@/server/actions/grower-actions"

export function GrowerCard({ grower }: { grower: GrowerRow }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<GrowerDraft>({
    name: grower.name,
    phone: grower.phone ?? "",
    notes: grower.notes ?? "",
  })
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function handleSave() {
    setBusy(true)
    setError("")
    const result = await updateGrower({
      id: grower.id,
      name: draft.name,
      phone: toNullable(draft.phone),
      notes: toNullable(draft.notes),
    })
    setBusy(false)
    if (result.success) {
      setEditing(false)
      router.refresh()
    } else {
      setError(result.error.message)
    }
  }

  async function handleDelete() {
    const consequence =
      grower.blocks.length > 0
        ? ` ${grower.blocks.length} בלוקים ישארו בלי כורם, והמחירים שלהם יישמרו.`
        : ""
    if (!window.confirm(`למחוק את הכורם ${grower.name}?${consequence}`)) return
    setBusy(true)
    const result = await deleteGrower(grower.id)
    setBusy(false)
    if (result.success) router.refresh()
    else setError(result.error.message)
  }

  return (
    <article className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5 space-y-4">
      {editing ? (
        <>
          <GrowerFields draft={draft} onChange={setDraft} />
          <div className="flex gap-2">
            <button type="button" onClick={handleSave} disabled={busy || !draft.name.trim()} className={primaryButtonClass}>
              שמירה
            </button>
            <button type="button" onClick={() => setEditing(false)} className={secondaryButtonClass}>
              ביטול
            </button>
          </div>
        </>
      ) : (
        <header className="flex flex-wrap items-start gap-x-4 gap-y-1">
          <div className="min-w-0">
            <h3 className="text-xl font-extrabold text-stone-900">{grower.name}</h3>
            {(grower.phone || grower.notes) && (
              <p className="text-sm font-medium text-stone-600 mt-0.5">
                {grower.phone && <bdi dir="ltr">{grower.phone}</bdi>}
                {grower.phone && grower.notes && " · "}
                {grower.notes}
              </p>
            )}
          </div>
          <div className="ms-auto flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className={secondaryButtonClass}>
              עריכה
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="border border-red-200 text-red-700 px-4 py-2.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              מחיקה
            </button>
          </div>
        </header>
      )}

      {error && (
        <p role="alert" className="text-red-600 text-sm">
          {error}
        </p>
      )}

      {grower.blocks.length === 0 ? (
        <p className="text-sm text-stone-500">אין בלוקים משויכים לכורם הזה. משייכים בטאב &quot;נתונים כספיים&quot; בכל בלוק.</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {grower.blocks.map((block) => (
            <li key={block.id}>
              <Link
                href={`/admin/vineyard/${block.id}?tab=finance`}
                className="flex items-baseline justify-between gap-3 py-2.5 hover:text-wine"
              >
                <span className="text-base font-bold text-stone-900">
                  {block.name} <span className="font-medium text-stone-600">· {block.variety}</span>
                </span>
                <span className="text-base font-extrabold text-stone-900 whitespace-nowrap">
                  {block.pricePerKgAgorot === null ? (
                    <span className="font-medium text-stone-400">אין מחיר</span>
                  ) : (
                    <bdi>{formatShekels(block.pricePerKgAgorot)} לק״ג</bdi>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
