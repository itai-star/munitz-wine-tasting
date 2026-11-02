// Dates in the calendar are plain days, written "YYYY-MM-DD", so a time zone can never move an event to another day.
export type DayKey = string

export type EventRow = {
  id: string
  categoryId: string
  categoryName: string
  color: string
  details: string
  date: DayKey
  startTime: string | null
  endTime: string | null
  city: string | null
  street: string | null
  cancelled: boolean
}

export type CategoryRow = { id: string; name: string; color: string }

export type CalendarView = "month" | "week"

export const MONTH_NAMES = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"]

// Sunday first, as in the Israeli week.
export const WEEKDAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]

export const WEEKDAY_INITIALS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"]

export const CATEGORY_COLORS = ["#166534", "#c2410c", "#1d4ed8", "#722F37", "#7e22ce", "#0f766e", "#be185d", "#a16207", "#475569", "#0e7490"]

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MS_PER_DAY = 86_400_000
const DAYS_PER_WEEK = 7

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

// A time of day written "HH:MM", as the time field of a form gives it.
export function isTimeOfDay(value: string): boolean {
  return TIME_PATTERN.test(value)
}

export function formatTimeRange(event: Pick<EventRow, "startTime" | "endTime">): string {
  if (event.startTime && event.endTime) return `${event.startTime}-${event.endTime}`
  return event.startTime ?? ""
}

export function formatPlace(event: Pick<EventRow, "city" | "street">): string {
  return [event.city, event.street].filter((part): part is string => Boolean(part)).join(", ")
}

// Within a day, events without a time come first and the rest follow in the order of their start.
export function compareEvents(a: EventRow, b: EventRow): number {
  return a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? "")
}

export function toDayKey(date: Date): DayKey {
  return date.toISOString().slice(0, 10)
}

export function parseDayKey(value: string): Date | null {
  const match = DAY_PATTERN.exec(value)
  if (!match) return null
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return toDayKey(date) === value ? date : null
}

export function dayKeyOf(year: number, month: number, day: number): DayKey {
  return toDayKey(new Date(Date.UTC(year, month - 1, day)))
}

export function addDays(key: DayKey, days: number): DayKey {
  const date = parseDayKey(key)
  if (!date) return key
  return toDayKey(new Date(date.getTime() + days * MS_PER_DAY))
}

// 0 is Sunday.
export function weekdayOf(key: DayKey): number {
  return parseDayKey(key)?.getUTCDay() ?? 0
}

export function startOfWeek(key: DayKey): DayKey {
  return addDays(key, -weekdayOf(key))
}

export function todayKey(now: Date = new Date()): DayKey {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(now)
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

// The weeks of a month, each a row of seven days that may begin or end in the neighbouring months.
export function monthWeeks(year: number, month: number): DayKey[][] {
  const first = dayKeyOf(year, month, 1)
  const last = dayKeyOf(year, month, daysInMonth(year, month))
  const weeks: DayKey[][] = []
  for (let start = startOfWeek(first); start <= last; start = addDays(start, DAYS_PER_WEEK)) {
    weeks.push(Array.from({ length: DAYS_PER_WEEK }, (_, index) => addDays(start, index)))
  }
  return weeks
}

export function weekDays(start: DayKey): DayKey[] {
  return Array.from({ length: DAYS_PER_WEEK }, (_, index) => addDays(start, index))
}

export function dayOfMonth(key: DayKey): number {
  return Number(key.slice(8, 10))
}

export function monthOf(key: DayKey): number {
  return Number(key.slice(5, 7))
}

export function yearOf(key: DayKey): number {
  return Number(key.slice(0, 4))
}

export function formatDayLong(key: DayKey): string {
  return `יום ${WEEKDAY_NAMES[weekdayOf(key)]}, ${dayOfMonth(key)} ב${MONTH_NAMES[monthOf(key) - 1]} ${yearOf(key)}`
}

export function formatDayShort(key: DayKey): string {
  return `${dayOfMonth(key)} ב${MONTH_NAMES[monthOf(key) - 1]}`
}

export function formatWeekRange(start: DayKey): string {
  const end = addDays(start, DAYS_PER_WEEK - 1)
  const sameMonth = monthOf(start) === monthOf(end)
  return sameMonth
    ? `${dayOfMonth(start)}-${dayOfMonth(end)} ב${MONTH_NAMES[monthOf(end) - 1]} ${yearOf(end)}`
    : `${formatDayShort(start)} - ${formatDayShort(end)} ${yearOf(end)}`
}

export function groupByDay(events: EventRow[]): Map<DayKey, EventRow[]> {
  const byDay = new Map<DayKey, EventRow[]>()
  for (const event of events) byDay.set(event.date, [...(byDay.get(event.date) ?? []), event])
  return byDay
}

export type CalendarPosition = { year: number; view: CalendarView; month: number; weekStart: DayKey }

// Reads the address of the page. Anything missing or invalid falls back to today, inside the chosen year.
export function resolvePosition(params: { year?: string; view?: string; month?: string; week?: string }, today: DayKey): CalendarPosition {
  const requestedYear = Number(params.year)
  const year = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100 ? requestedYear : yearOf(today)
  const view: CalendarView = params.view === "week" ? "week" : "month"

  const requestedMonth = Number(params.month)
  const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : year === yearOf(today) ? monthOf(today) : 1

  const requestedWeek = params.week && parseDayKey(params.week) ? startOfWeek(params.week) : null
  const fallbackDay = year === yearOf(today) ? today : dayKeyOf(year, 1, 1)
  return { year, view, month, weekStart: requestedWeek ?? startOfWeek(fallbackDay) }
}

export function calendarHref(position: Partial<CalendarPosition> & { year: number }): string {
  const params = new URLSearchParams({ year: String(position.year), view: position.view ?? "month" })
  if (position.view === "week") {
    if (position.weekStart) params.set("week", position.weekStart)
  } else if (position.month) {
    params.set("month", String(position.month))
  }
  return `/admin/events?${params.toString()}`
}
