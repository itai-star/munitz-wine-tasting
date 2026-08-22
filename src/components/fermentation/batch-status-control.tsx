"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateBatchStatus } from "@/server/actions/fermentation-actions"

export function BatchStatusControl({
  batchId,
  status,
}: {
  batchId: string
  status: string
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function handleComplete() {
    setSubmitting(true)
    setError("")
    const result = await updateBatchStatus({
      id: batchId,
      status: "completed",
      endDate: new Date(),
    })
    setSubmitting(false)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error.message)
    }
  }

  if (status === "completed") {
    return <span className="text-sm text-stone-500">התסיסה הסתיימה</span>
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleComplete}
        disabled={submitting}
        className="text-sm border border-stone-300 text-stone-700 px-4 py-2 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
      >
        {submitting ? "מעדכן..." : "סמן כתסיסה שהסתיימה"}
      </button>
      {error && <span className="text-red-600 text-xs">{error}</span>}
    </div>
  )
}
