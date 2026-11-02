"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createEventCategory, deleteEventCategory, renameEventCategory } from "@/server/actions/event-actions"
import type { CategoryRow } from "@/lib/calendar-events"
import type { Result } from "@/types"

const buttonClass =
  "min-h-10 rounded-lg border border-stone-300 px-3 text-sm font-bold text-stone-800 hover:bg-stone-50 transition-colors disabled:opacity-50"

export function EventCategoriesEditor({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [newName, setNewName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")

  async function run(action: () => Promise<Result<unknown>>, done?: () => void): Promise<void> {
    setBusy(true)
    setMessage("")
    const result = await action()
    setBusy(false)
    if (result.success) {
      done?.()
      router.refresh()
    } else {
      setMessage(result.error.message)
    }
  }

  return (
    <details className="rounded-2xl border border-stone-200 bg-white p-4">
      <summary className="cursor-pointer text-base font-extrabold text-wine">קטגוריות אירועים ({categories.length})</summary>
      <div className="mt-3 space-y-3">
        <p className="text-sm text-stone-600">הקטגוריות שאפשר לבחור באירוע. כל קטגוריה מקבלת צבע משלה בלוח. קטגוריה שיש בה אירועים לא ניתנת למחיקה.</p>

        {message && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
            {message}
          </p>
        )}

        <ul className="space-y-2">
          {categories.map((category) => (
            <li key={category.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 p-2.5">
              <span className="h-4 w-4 shrink-0 rounded-sm" style={{ backgroundColor: category.color }} aria-hidden="true" />
              {editingId === category.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    maxLength={40}
                    aria-label="שם הקטגוריה"
                    className="min-h-10 min-w-0 flex-1 rounded-lg border border-stone-300 px-3 text-base"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    className={buttonClass}
                    onClick={() => run(() => renameEventCategory(category.id, editName), () => setEditingId(null))}
                  >
                    שמירה
                  </button>
                  <button type="button" className="min-h-10 px-2 text-sm font-bold text-stone-600 hover:underline" onClick={() => setEditingId(null)}>
                    ביטול
                  </button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 text-base font-bold text-stone-900">{category.name}</span>
                  <button
                    type="button"
                    className={buttonClass}
                    onClick={() => {
                      setEditingId(category.id)
                      setEditName(category.name)
                    }}
                  >
                    שינוי שם
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="min-h-10 px-2 text-sm font-bold text-red-700 hover:underline disabled:opacity-50"
                    onClick={() => {
                      if (confirm(`למחוק את הקטגוריה "${category.name}"?`)) void run(() => deleteEventCategory(category.id))
                    }}
                  >
                    מחיקה
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>

        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void run(() => createEventCategory(newName), () => setNewName(""))
          }}
        >
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            maxLength={40}
            placeholder="שם קטגוריה חדשה"
            aria-label="שם קטגוריה חדשה"
            className="min-h-10 min-w-0 flex-1 rounded-lg border border-stone-300 px-3 text-base"
          />
          <button type="submit" disabled={busy || newName.trim().length === 0} className="min-h-10 rounded-lg bg-wine px-4 text-sm font-bold text-white hover:bg-wine-dark transition-colors disabled:opacity-50">
            הוספת קטגוריה
          </button>
        </form>
      </div>
    </details>
  )
}
