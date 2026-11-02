import Link from "next/link"
import {
  MONTH_NAMES,
  addDays,
  calendarHref,
  dayKeyOf,
  formatWeekRange,
  startOfWeek,
  yearOf,
} from "@/lib/calendar-events"
import type { CalendarPosition, DayKey, EventRow } from "@/lib/calendar-events"
import { AddEventButton } from "@/components/events/event-triggers"

const chip = "inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-bold transition-colors"
const chipOff = "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
const chipOn = "border-wine bg-wine text-white"

function weekYear(weekStart: DayKey): number {
  return yearOf(addDays(weekStart, 3))
}

function neighbourHref(position: CalendarPosition, step: -1 | 1): string {
  if (position.view === "week") {
    const weekStart = addDays(position.weekStart, step * 7)
    return calendarHref({ year: weekYear(weekStart), view: "week", weekStart })
  }
  const index = position.year * 12 + (position.month - 1) + step
  return calendarHref({ year: Math.floor(index / 12), view: "month", month: (index % 12) + 1 })
}

export function EventsToolbar({
  position,
  years,
  events,
  today,
}: {
  position: CalendarPosition
  years: number[]
  events: EventRow[]
  today: DayKey
}) {
  const { year, view, month, weekStart } = position
  const perMonth = new Map<number, number>()
  for (const event of events) {
    if (yearOf(event.date) === year && !event.cancelled) perMonth.set(Number(event.date.slice(5, 7)), (perMonth.get(Number(event.date.slice(5, 7))) ?? 0) + 1)
  }

  const title = view === "week" ? formatWeekRange(weekStart) : `${MONTH_NAMES[month - 1]} ${year}`
  const todayHref =
    view === "week"
      ? calendarHref({ year: weekYear(startOfWeek(today)), view: "week", weekStart: startOfWeek(today) })
      : calendarHref({ year: yearOf(today), view: "month", month: Number(today.slice(5, 7)) })
  const newEventDate = view === "week" ? (today >= weekStart && today <= addDays(weekStart, 6) ? today : weekStart) : year === yearOf(today) && month === Number(today.slice(5, 7)) ? today : dayKeyOf(year, month, 1)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2" aria-label="בחירת שנה">
        <span className="text-sm font-extrabold text-stone-700">שנה</span>
        {years.map((candidate) => (
          <Link
            key={candidate}
            href={
              view === "week"
                ? calendarHref({ year: candidate, view: "week", weekStart: startOfWeek(candidate === yearOf(today) ? today : dayKeyOf(candidate, 1, 1)) })
                : calendarHref({ year: candidate, view: "month", month })
            }
            aria-current={candidate === year ? "page" : undefined}
            className={`${chip} ${candidate === year ? chipOn : chipOff}`}
          >
            {candidate}
          </Link>
        ))}
        <span className="mx-1 hidden h-6 w-px bg-stone-300 sm:block" aria-hidden="true" />
        <Link href={calendarHref({ year, view: "month", month })} aria-current={view === "month" ? "page" : undefined} className={`${chip} ${view === "month" ? chipOn : chipOff}`}>
          חודשי
        </Link>
        <Link
          href={calendarHref({ year, view: "week", weekStart })}
          aria-current={view === "week" ? "page" : undefined}
          className={`${chip} ${view === "week" ? chipOn : chipOff}`}
        >
          שבועי
        </Link>
      </div>

      {view === "month" && (
        <nav aria-label="בחירת חודש" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {MONTH_NAMES.map((name, index) => (
            <Link
              key={name}
              href={calendarHref({ year, view: "month", month: index + 1 })}
              aria-current={index + 1 === month ? "page" : undefined}
              className={`${chip} gap-1.5 ${index + 1 === month ? chipOn : chipOff}`}
            >
              {name}
              {(perMonth.get(index + 1) ?? 0) > 0 && (
                <span className={`rounded-full px-1.5 text-xs font-extrabold ${index + 1 === month ? "bg-white/25" : "bg-stone-200 text-stone-800"}`}>
                  {perMonth.get(index + 1)}
                </span>
              )}
            </Link>
          ))}
        </nav>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={neighbourHref(position, -1)} aria-label="הקודם" className={`${chip} ${chipOff} w-11 px-0 text-lg`}>
            ›
          </Link>
          <h2 className="min-w-40 text-center text-xl font-extrabold text-stone-900">{title}</h2>
          <Link href={neighbourHref(position, 1)} aria-label="הבא" className={`${chip} ${chipOff} w-11 px-0 text-lg`}>
            ‹
          </Link>
          <Link href={todayHref} className={`${chip} ${chipOff}`}>
            היום
          </Link>
        </div>
        <AddEventButton date={newEventDate} label="+ אירוע חדש" />
      </div>
    </div>
  )
}
