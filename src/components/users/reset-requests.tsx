"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { dismissResetRequest } from "@/server/actions/user-actions"
import type { ResetRequestRow } from "@/server/actions/user-actions"

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("he-IL", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })
}

export function ResetRequests({ requests }: { requests: ResetRequestRow[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  if (requests.length === 0) return null

  async function handleDismiss(id: string) {
    setBusyId(id)
    await dismissResetRequest(id)
    setBusyId(null)
    router.refresh()
  }

  return (
    <section className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3" aria-label="בקשות לאיפוס סיסמה">
      <h2 className="font-semibold text-amber-900">בקשות לאיפוס סיסמה ({requests.length})</h2>
      <p className="text-sm text-amber-900/80">
        כדי לטפל בבקשה, יש לבחור &quot;איפוס סיסמה&quot; בכרטיס של המשתמש ולהעביר לו את הסיסמה הזמנית. הבקשה נסגרת אוטומטית אחרי האיפוס.
      </p>
      <ul className="divide-y divide-amber-200">
        {requests.map((request) => (
          <li key={request.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <b dir="ltr" className="text-stone-800">
              {request.username}
            </b>
            {!request.userExists && <span className="text-xs text-red-700">משתמש לא קיים</span>}
            <span className="text-xs text-stone-600">{formatTime(request.requestedAt)}</span>
            <span className="text-xs text-stone-600">{request.emailSent ? "נשלח מייל" : "לא נשלח מייל"}</span>
            <button
              type="button"
              onClick={() => handleDismiss(request.id)}
              disabled={busyId === request.id}
              className="ms-auto border border-amber-300 rounded-lg px-3 min-h-10 text-sm text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              סגירת הבקשה
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
