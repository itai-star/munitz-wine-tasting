"use client"

import { useEventEditor } from "@/components/events/event-editor"
import type { DayKey, EventRow } from "@/lib/calendar-events"

// An event on the calendar, written as a coloured line that opens the editor. A cancelled event stays, struck through.
export function EventPill({ event, showDate }: { event: EventRow; showDate?: string }) {
  const { openEdit } = useEventEditor()
  return (
    <button
      type="button"
      onClick={() => openEdit(event)}
      className={`block w-full rounded-md border-s-4 px-2 py-1 text-start text-xs sm:text-sm font-bold leading-snug text-stone-900 hover:brightness-95 ${
        event.cancelled ? "opacity-60" : ""
      }`}
      style={{ backgroundColor: `${event.color}22`, borderInlineStartColor: event.color }}
    >
      {showDate && <span className="block text-xs font-semibold text-stone-600">{showDate}</span>}
      <span className="block text-[11px] font-extrabold" style={{ color: event.color }}>
        {event.categoryName}
        {event.cancelled && " · מבוטל"}
      </span>
      <span className={`block break-words ${event.cancelled ? "line-through" : ""}`}>{event.details}</span>
    </button>
  )
}

export function AddEventButton({ date, label, className }: { date: DayKey; label: string; className?: string }) {
  const { openCreate } = useEventEditor()
  return (
    <button
      type="button"
      onClick={() => openCreate(date)}
      className={
        className ??
        "inline-flex min-h-10 items-center justify-center rounded-lg bg-wine px-4 text-sm font-bold text-white hover:bg-wine-dark transition-colors"
      }
    >
      {label}
    </button>
  )
}
