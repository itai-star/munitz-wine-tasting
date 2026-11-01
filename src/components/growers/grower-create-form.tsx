"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GrowerFields, primaryButtonClass, toNullable } from "@/components/growers/grower-fields"
import type { GrowerDraft } from "@/components/growers/grower-fields"
import { createGrower } from "@/server/actions/grower-actions"

const EMPTY: GrowerDraft = { name: "", phone: "", notes: "" }

export function GrowerCreateForm() {
  const router = useRouter()
  const [draft, setDraft] = useState<GrowerDraft>(EMPTY)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    const result = await createGrower({ name: draft.name, phone: toNullable(draft.phone), notes: toNullable(draft.notes) })
    setSubmitting(false)
    if (result.success) {
      setDraft(EMPTY)
      router.refresh()
    } else {
      setError(result.error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5 space-y-4">
      <h2 className="text-lg font-extrabold text-stone-900">כורם חדש</h2>
      {error && (
        <p role="alert" className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">
          {error}
        </p>
      )}
      <GrowerFields draft={draft} onChange={setDraft} />
      <button type="submit" disabled={submitting || !draft.name.trim()} className={primaryButtonClass}>
        {submitting ? "שומר..." : "הוספת כורם"}
      </button>
    </form>
  )
}
