"use client"

import { useState } from "react"
import Link from "next/link"
import { toggleSession, deleteSession } from "@/server/actions/session-actions"
import { useRouter } from "next/navigation"

type Session = {
  id: string
  name: string
  date: Date
  isActive: boolean
  wines: {
    id: string
    wine: { name: string; year: number | null }
  }[]
  _count: { ratings: number; impressions: number }
}

export function SessionList({ sessions }: { sessions: Session[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleToggle(id: string) {
    setLoading(id)
    await toggleSession(id)
    router.refresh()
    setLoading(null)
  }

  async function handleDelete(id: string) {
    if (!confirm("האם אתה בטוח שברצונך למחוק את הטעימה?")) return
    setLoading(id)
    await deleteSession(id)
    router.refresh()
    setLoading(null)
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-stone-200">
        <p className="text-stone-500 text-lg mb-2">אין טעימות עדיין</p>
        <Link
          href="/admin/sessions/new"
          className="text-wine underline text-sm"
        >
          צור טעימה חדשה
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="bg-white rounded-xl shadow-sm border border-stone-200 p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-stone-800">
                  {session.name}
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    session.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {session.isActive ? "פעילה" : "לא פעילה"}
                </span>
              </div>
              <p className="text-stone-500 text-sm mb-3">
                {new Date(session.date).toLocaleDateString("he-IL")} · {session.wines.length} יינות · {session._count.impressions} משתתפים
              </p>
              <div className="flex flex-wrap gap-2">
                {session.wines.map((sw) => (
                  <span
                    key={sw.id}
                    className="inline-block bg-stone-100 text-stone-600 text-xs px-2 py-1 rounded"
                  >
                    {sw.wine.name}
                    {sw.wine.year ? ` ${sw.wine.year}` : ""}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                href={`/tasting/${session.id}`}
                className="text-xs px-3 py-1.5 border border-stone-300 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors"
              >
                צפה
              </Link>
              <button
                onClick={() => handleToggle(session.id)}
                disabled={loading === session.id}
                className="text-xs px-3 py-1.5 border border-stone-300 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                {session.isActive ? "השבת" : "הפעל"}
              </button>
              <button
                onClick={() => handleDelete(session.id)}
                disabled={loading === session.id}
                className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                מחק
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
