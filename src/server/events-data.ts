import { prisma } from "@/lib/prisma"
import { compareEvents, parseDayKey, toDayKey } from "@/lib/calendar-events"
import type { CategoryRow, DayKey, EventRow } from "@/lib/calendar-events"

export async function loadCategories(): Promise<CategoryRow[]> {
  const categories = await prisma.eventCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })
  return categories.map((category) => ({ id: category.id, name: category.name, color: category.color }))
}

function toRow(event: {
  id: string
  categoryId: string
  details: string
  date: Date
  startTime: string | null
  endTime: string | null
  city: string | null
  street: string | null
  cancelledAt: Date | null
  category: { name: string; color: string }
}): EventRow {
  return {
    id: event.id,
    categoryId: event.categoryId,
    categoryName: event.category.name,
    color: event.category.color,
    details: event.details,
    date: toDayKey(event.date),
    startTime: event.startTime,
    endTime: event.endTime,
    city: event.city,
    street: event.street,
    cancelled: event.cancelledAt !== null,
  }
}

// Both ends are included. Without an end the whole calendar is returned.
export async function loadEvents(range?: { from: DayKey; to: DayKey }): Promise<EventRow[]> {
  const from = range ? parseDayKey(range.from) : null
  const to = range ? parseDayKey(range.to) : null
  const events = await prisma.calendarEvent.findMany({
    where: from && to ? { date: { gte: from, lte: to } } : undefined,
    include: { category: { select: { name: true, color: true } } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  })
  return events.map(toRow).sort(compareEvents)
}

// The years that hold events, for the year filter.
export async function loadEventYears(): Promise<number[]> {
  const { _min, _max } = await prisma.calendarEvent.aggregate({ _min: { date: true }, _max: { date: true } })
  if (!_min.date || !_max.date) return []
  const first = _min.date.getUTCFullYear()
  const last = _max.date.getUTCFullYear()
  return Array.from({ length: last - first + 1 }, (_, index) => first + index)
}
