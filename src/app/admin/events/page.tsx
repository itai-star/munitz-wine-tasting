import { addDays, dayKeyOf, resolvePosition, todayKey, yearOf } from "@/lib/calendar-events"
import { EventCategoriesEditor } from "@/components/events/event-categories-editor"
import { EventEditorProvider } from "@/components/events/event-editor"
import { EventsExcelPanel } from "@/components/events/events-excel-panel"
import { EventsToolbar } from "@/components/events/events-toolbar"
import { MonthView, WeekView } from "@/components/events/events-views"
import { loadCategories, loadEventYears, loadEvents } from "@/server/events-data"

export const dynamic = "force-dynamic"

const WEEK_PADDING_DAYS = 7

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; view?: string; month?: string; week?: string }>
}) {
  const today = todayKey()
  const position = resolvePosition(await searchParams, today)

  // A little beyond the year, so the first and last weeks show the events of the neighbouring days.
  const [categories, eventYears, events] = await Promise.all([
    loadCategories(),
    loadEventYears(),
    loadEvents({
      from: addDays(dayKeyOf(position.year, 1, 1), -WEEK_PADDING_DAYS),
      to: addDays(dayKeyOf(position.year, 12, 31), WEEK_PADDING_DAYS),
    }),
  ])
  const years = Array.from(new Set([...eventYears, yearOf(today), yearOf(today) + 1, position.year])).sort((a, b) => a - b)

  return (
    <EventEditorProvider categories={categories}>
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-stone-800">לוח אירועים</h1>

        <EventsToolbar position={position} years={years} events={events} today={today} />

        {position.view === "month" ? (
          <MonthView year={position.year} month={position.month} today={today} events={events} />
        ) : (
          <WeekView weekStart={position.weekStart} today={today} events={events} />
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          <EventsExcelPanel year={position.year} />
          <EventCategoriesEditor categories={categories} />
        </div>
      </div>
    </EventEditorProvider>
  )
}
