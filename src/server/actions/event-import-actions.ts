"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { parseDayKey, toDayKey } from "@/lib/calendar-events"
import { normalizeHeader } from "@/lib/vineyard-excel"
import { requirePermission } from "@/server/auth/guards"
import { parseEventsWorkbook } from "@/server/events-excel"
import { ok, err } from "@/types"
import type { Result } from "@/types"

const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_DETAILS = 500

export type EventsImportSummary = {
  created: number
  skipped: number
  errors: { row: number; message: string }[]
}

// An event is the same event when its kind, its details and its day all match.
function signature(categoryId: string, details: string, date: string): string {
  return `${categoryId}|${normalizeHeader(details)}|${date}`
}

// Adds the events of a workbook. A kind must already be on the list, a row that repeats an event already on
// the calendar is skipped, so loading the same file again changes nothing, and a row with a problem is reported
// while the other rows are still saved.
export async function importEventsFromExcel(formData: FormData): Promise<Result<EventsImportSummary>> {
  await requirePermission("EVENTS")

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return err({ code: "VALIDATION", message: "יש לבחור קובץ אקסל" })
  if (file.size > MAX_FILE_BYTES) return err({ code: "VALIDATION", message: "הקובץ גדול מדי" })

  let rows
  try {
    rows = await parseEventsWorkbook(await file.arrayBuffer())
  } catch {
    return err({ code: "VALIDATION", message: "לא ניתן לקרוא את הקובץ. יש להעלות קובץ אקסל בפורמט xlsx" })
  }
  if (!rows) return err({ code: "VALIDATION", message: "בקובץ חסרות העמודות קטגוריה, פרטי האירוע ותאריך" })

  const [categories, existing] = await Promise.all([
    prisma.eventCategory.findMany({ select: { id: true, name: true } }),
    prisma.calendarEvent.findMany({ select: { categoryId: true, details: true, date: true } }),
  ])
  const categoryIdByName = new Map(categories.map((category) => [normalizeHeader(category.name), category.id]))
  const seen = new Set(existing.map((event) => signature(event.categoryId, event.details, toDayKey(event.date))))

  const errors: EventsImportSummary["errors"] = []
  const data: { categoryId: string; details: string; date: Date; cancelledAt: Date | null }[] = []
  let skipped = 0

  for (const row of rows) {
    const categoryId = categoryIdByName.get(normalizeHeader(row.category))
    const date = row.date ? parseDayKey(row.date) : null
    if (!row.category) errors.push({ row: row.row, message: "חסרה קטגוריה" })
    else if (!categoryId) errors.push({ row: row.row, message: `הקטגוריה "${row.category}" לא קיימת ברשימה` })
    else if (!row.details) errors.push({ row: row.row, message: "חסרים פרטי האירוע" })
    else if (row.details.length > MAX_DETAILS) errors.push({ row: row.row, message: "פרטי האירוע ארוכים מדי" })
    else if (!date || !row.date) errors.push({ row: row.row, message: "התאריך חסר או לא תקין" })
    else {
      const key = signature(categoryId, row.details, row.date)
      if (seen.has(key)) skipped += 1
      else {
        seen.add(key)
        data.push({ categoryId, details: row.details, date, cancelledAt: row.cancelled ? new Date() : null })
      }
    }
  }

  try {
    if (data.length > 0) await prisma.calendarEvent.createMany({ data })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת האירועים" })
  }
  revalidatePath("/admin/events")
  return ok({ created: data.length, skipped, errors })
}
