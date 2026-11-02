import Link from "next/link"
import {
  MONTH_NAMES,
  WEEKDAY_NAMES,
  WEEKDAY_INITIALS,
  addDays,
  calendarHref,
  dayOfMonth,
  formatDayLong,
  groupByDay,
  monthOf,
  monthWeeks,
  startOfWeek,
  weekDays,
  weekdayOf,
  yearOf,
} from "@/lib/calendar-events"
import type { DayKey, EventRow } from "@/lib/calendar-events"
import { AddEventButton, EventPill } from "@/components/events/event-triggers"

const MAX_PILLS_IN_CELL = 3

function dayLabel(key: DayKey): string {
  return `${WEEKDAY_NAMES[weekdayOf(key)]} ${dayOfMonth(key)}`
}

function weekLink(day: DayKey): string {
  const weekStart = startOfWeek(day)
  return calendarHref({ year: yearOf(addDays(weekStart, 3)), view: "week", weekStart })
}

function MonthGridDesktop({ year, month, today, byDay }: { year: number; month: number; today: DayKey; byDay: Map<DayKey, EventRow[]> }) {
  const weeks = monthWeeks(year, month)
  return (
    <div className="hidden md:block rounded-2xl border border-stone-200 bg-white overflow-hidden">
      <div className="grid grid-cols-7 bg-stone-100 text-center text-sm font-extrabold text-stone-700">
        {WEEKDAY_NAMES.map((name) => (
          <div key={name} className="py-2.5">
            {name}
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week[0]} className="grid grid-cols-7 border-t border-stone-200">
          {week.map((day) => {
            const inMonth = monthOf(day) === month
            const events = byDay.get(day) ?? []
            const shown = events.slice(0, MAX_PILLS_IN_CELL)
            const hidden = events.length - shown.length
            return (
              <div key={day} className={`min-h-28 border-s border-stone-200 p-1.5 first:border-s-0 ${inMonth ? "bg-white" : "bg-stone-50"}`}>
                <div className="flex items-center justify-between">
                  <Link
                    href={weekLink(day)}
                    className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm font-extrabold ${
                      day === today ? "bg-wine text-white" : inMonth ? "text-stone-900 hover:bg-stone-100" : "text-stone-400"
                    }`}
                    aria-label={`תצוגת השבוע של ${formatDayLong(day)}`}
                  >
                    {dayOfMonth(day)}
                  </Link>
                  <AddEventButton
                    date={day}
                    label="+"
                    className="h-7 w-7 rounded-full text-lg leading-none text-stone-400 hover:bg-stone-100 hover:text-wine"
                  />
                </div>
                <div className="mt-1 space-y-1">
                  {shown.map((event) => (
                    <EventPill key={event.id} event={event} />
                  ))}
                  {hidden > 0 && (
                    <Link href={weekLink(day)} className="block px-1 text-xs font-bold text-wine hover:underline">
                      ועוד {hidden}
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function MonthGridPhone({ year, month, today, byDay }: { year: number; month: number; today: DayKey; byDay: Map<DayKey, EventRow[]> }) {
  const weeks = monthWeeks(year, month)
  return (
    <div className="md:hidden rounded-2xl border border-stone-200 bg-white overflow-hidden">
      <div className="grid grid-cols-7 bg-stone-100 text-center text-xs font-extrabold text-stone-700">
        {WEEKDAY_INITIALS.map((initial, index) => (
          <div key={WEEKDAY_NAMES[index]} className="py-2" aria-label={WEEKDAY_NAMES[index]}>
            {initial}
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week[0]} className="grid grid-cols-7 border-t border-stone-200">
          {week.map((day) => {
            const inMonth = monthOf(day) === month
            const events = byDay.get(day) ?? []
            return (
              <Link
                key={day}
                href={weekLink(day)}
                aria-label={`${formatDayLong(day)}${events.length > 0 ? `, ${events.length} אירועים` : ""}`}
                className={`flex min-h-14 flex-col items-center gap-1 border-s border-stone-200 py-1.5 first:border-s-0 ${inMonth ? "" : "bg-stone-50"}`}
              >
                <span
                  className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm font-extrabold ${
                    day === today ? "bg-wine text-white" : inMonth ? "text-stone-900" : "text-stone-400"
                  }`}
                >
                  {dayOfMonth(day)}
                </span>
                <span className="flex flex-wrap justify-center gap-0.5 px-0.5">
                  {events.slice(0, 4).map((event) => (
                    <span key={event.id} className={`h-2 w-2 rounded-full ${event.cancelled ? "opacity-40" : ""}`} style={{ backgroundColor: event.color }} />
                  ))}
                </span>
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// On a phone the month is also a list, because a line of text does not fit in a day cell.
function MonthAgenda({ month, year, events }: { month: number; year: number; events: EventRow[] }) {
  const inMonth = events.filter((event) => monthOf(event.date) === month && yearOf(event.date) === year)
  return (
    <section className="md:hidden">
      <h3 className="text-lg font-extrabold text-stone-900">
        אירועי {MONTH_NAMES[month - 1]} {year}
      </h3>
      {inMonth.length === 0 ? (
        <p className="mt-2 text-base text-stone-500">אין אירועים בחודש הזה.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {inMonth.map((event) => (
            <li key={event.id}>
              <EventPill event={event} showDate={formatDayLong(event.date)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function MonthView({ year, month, today, events }: { year: number; month: number; today: DayKey; events: EventRow[] }) {
  const byDay = groupByDay(events)
  return (
    <div className="space-y-5">
      <MonthGridDesktop year={year} month={month} today={today} byDay={byDay} />
      <MonthGridPhone year={year} month={month} today={today} byDay={byDay} />
      <MonthAgenda year={year} month={month} events={events} />
    </div>
  )
}

export function WeekView({ weekStart, today, events }: { weekStart: DayKey; today: DayKey; events: EventRow[] }) {
  const byDay = groupByDay(events)
  return (
    <div className="grid gap-3 md:grid-cols-7">
      {weekDays(weekStart).map((day) => {
        const dayEvents = byDay.get(day) ?? []
        return (
          <section
            key={day}
            className={`rounded-2xl border bg-white p-3 ${day === today ? "border-wine ring-2 ring-wine/20" : "border-stone-200"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-extrabold text-stone-900">
                {dayLabel(day)} <span className="text-sm font-semibold text-stone-500">ב{MONTH_NAMES[monthOf(day) - 1]}</span>
              </h3>
              <AddEventButton
                date={day}
                label="+"
                className="h-9 w-9 shrink-0 rounded-full border border-stone-300 text-lg leading-none text-stone-600 hover:bg-stone-50 hover:text-wine"
              />
            </div>
            <div className="mt-2 space-y-1.5">
              {dayEvents.length === 0 ? (
                <p className="text-sm text-stone-400">אין אירועים</p>
              ) : (
                dayEvents.map((event) => <EventPill key={event.id} event={event} />)
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
