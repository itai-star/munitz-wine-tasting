"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createEvent, deleteEvent, setEventCancelled, updateEvent } from "@/server/actions/event-actions"
import { formatDayLong } from "@/lib/calendar-events"
import type { CategoryRow, DayKey, EventRow } from "@/lib/calendar-events"
import type { Result } from "@/types"

type EditorState = { mode: "create"; date: DayKey } | { mode: "edit"; event: EventRow }

type EditorApi = {
  openCreate: (date: DayKey) => void
  openEdit: (event: EventRow) => void
}

const EditorContext = createContext<EditorApi | null>(null)

export function useEventEditor(): EditorApi {
  const api = useContext(EditorContext)
  if (!api) throw new Error("useEventEditor must be used inside EventEditorProvider")
  return api
}

const inputClass =
  "w-full min-h-11 border border-stone-300 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none bg-white"
const labelClass = "block text-sm font-bold text-stone-800 mb-1"

export function EventEditorProvider({ categories, children }: { categories: CategoryRow[]; children: React.ReactNode }) {
  const [state, setState] = useState<EditorState | null>(null)
  const openCreate = useCallback((date: DayKey) => setState({ mode: "create", date }), [])
  const openEdit = useCallback((event: EventRow) => setState({ mode: "edit", event }), [])
  const close = useCallback(() => setState(null), [])

  return (
    <EditorContext.Provider value={{ openCreate, openEdit }}>
      {children}
      {state && <EventDialog key={state.mode === "edit" ? state.event.id : `new-${state.date}`} state={state} categories={categories} onClose={close} />}
    </EditorContext.Provider>
  )
}

function EventDialog({ state, categories, onClose }: { state: EditorState; categories: CategoryRow[]; onClose: () => void }) {
  const router = useRouter()
  const existing = state.mode === "edit" ? state.event : null
  const firstFieldRef = useRef<HTMLSelectElement>(null)
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? "")
  const [details, setDetails] = useState(existing?.details ?? "")
  const [date, setDate] = useState<DayKey>(existing?.date ?? (state.mode === "create" ? state.date : ""))
  const [startTime, setStartTime] = useState(existing?.startTime ?? "")
  const [endTime, setEndTime] = useState(existing?.endTime ?? "")
  const [city, setCity] = useState(existing?.city ?? "")
  const [street, setStreet] = useState(existing?.street ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    firstFieldRef.current?.focus()
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  async function run(action: () => Promise<Result<unknown>>): Promise<void> {
    setBusy(true)
    setError("")
    const result = await action()
    setBusy(false)
    if (result.success) {
      onClose()
      router.refresh()
    } else {
      setError(result.error.message)
    }
  }

  function save(event: React.FormEvent): void {
    event.preventDefault()
    const fields = { categoryId, details, date, startTime, endTime, city, street }
    void run(() => (existing ? updateEvent({ id: existing.id, ...fields }) : createEvent(fields)))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={existing ? "עריכת אירוע" : "אירוע חדש"}
        onSubmit={save}
        onClick={(event) => event.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-stone-900">{existing ? "עריכת אירוע" : "אירוע חדש"}</h2>
            {date && <p className="text-sm font-semibold text-stone-600 mt-0.5">{formatDayLong(date)}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="סגירה" className="h-10 w-10 rounded-full text-2xl leading-none text-stone-500 hover:bg-stone-100">
            ×
          </button>
        </div>

        {existing?.cancelled && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm font-bold text-red-800">האירוע מבוטל, ומסומן כך בלוח.</p>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
            {error}
          </p>
        )}

        <div>
          <label className={labelClass} htmlFor="event-category">
            קטגוריה *
          </label>
          <select ref={firstFieldRef} id="event-category" className={inputClass} value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>
            <option value="">— בחירה —</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="event-details">
            פרטי האירוע *
          </label>
          <textarea
            id="event-details"
            className={`${inputClass} min-h-24`}
            value={details}
            maxLength={500}
            onChange={(event) => setDetails(event.target.value)}
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="event-date">
            תאריך *
          </label>
          <input id="event-date" type="date" className={inputClass} value={date} onChange={(event) => setDate(event.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="event-start">
              שעת התחלה
            </label>
            <input id="event-start" type="time" className={inputClass} value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="event-end">
              שעת סיום
            </label>
            <input id="event-end" type="time" className={inputClass} value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="event-city">
              עיר
            </label>
            <input id="event-city" className={inputClass} value={city} maxLength={60} onChange={(event) => setCity(event.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="event-street">
              רחוב
            </label>
            <input id="event-street" className={inputClass} value={street} maxLength={60} onChange={(event) => setStreet(event.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 rounded-lg bg-wine px-6 text-base font-bold text-white hover:bg-wine-dark transition-colors disabled:opacity-50"
          >
            {busy ? "שומר..." : "שמירה"}
          </button>
          <button type="button" onClick={onClose} className="min-h-11 px-3 text-base font-bold text-stone-600 hover:underline">
            סגירה
          </button>
        </div>

        {existing && (
          <div className="flex flex-wrap items-center gap-3 border-t border-stone-200 pt-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => setEventCancelled(existing.id, !existing.cancelled))}
              className="min-h-11 rounded-lg border border-stone-300 px-4 text-sm font-bold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
            >
              {existing.cancelled ? "החזרת האירוע ללוח" : "ביטול האירוע"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (confirm("למחוק את האירוע לצמיתות? אפשר גם רק לבטל אותו ולהשאיר אותו בלוח.")) void run(() => deleteEvent(existing.id))
              }}
              className="min-h-11 px-3 text-sm font-bold text-red-700 hover:underline disabled:opacity-50"
            >
              מחיקה
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
