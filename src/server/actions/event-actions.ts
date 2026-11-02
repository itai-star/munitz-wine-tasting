"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { CATEGORY_COLORS, parseDayKey } from "@/lib/calendar-events"
import { requirePermission } from "@/server/auth/guards"
import { ok, err } from "@/types"
import type { Result } from "@/types"

const PAGE = "/admin/events"
const MAX_DETAILS = 500
const MAX_CATEGORY_NAME = 40

const EventFieldsSchema = z.object({
  categoryId: z.string().min(1, "יש לבחור קטגוריה"),
  details: z.string().trim().min(1, "יש להזין את פרטי האירוע").max(MAX_DETAILS, "פרטי האירוע ארוכים מדי"),
  date: z.string().refine((value) => parseDayKey(value) !== null, "יש לבחור תאריך תקין"),
})

const UpdateEventSchema = EventFieldsSchema.extend({ id: z.string().min(1) })

const CategoryNameSchema = z
  .string()
  .transform((value) => value.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1, "יש להזין שם קטגוריה").max(MAX_CATEGORY_NAME, "שם הקטגוריה ארוך מדי"))

function isDuplicate(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}

function dateOf(value: string): Date {
  const date = parseDayKey(value)
  if (!date) throw new Error("Invalid date")
  return date
}

export async function createEvent(input: z.input<typeof EventFieldsSchema>): Promise<Result<{ id: string }>> {
  await requirePermission("EVENTS")
  const parsed = EventFieldsSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  try {
    const event = await prisma.calendarEvent.create({
      data: { categoryId: parsed.data.categoryId, details: parsed.data.details, date: dateOf(parsed.data.date) },
    })
    revalidatePath(PAGE)
    return ok({ id: event.id })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת האירוע" })
  }
}

export async function updateEvent(input: z.input<typeof UpdateEventSchema>): Promise<Result<void>> {
  await requirePermission("EVENTS")
  const parsed = UpdateEventSchema.safeParse(input)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  const { id, categoryId, details, date } = parsed.data
  try {
    await prisma.calendarEvent.update({ where: { id }, data: { categoryId, details, date: dateOf(date) } })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בעדכון האירוע" })
  }
}

// A cancelled event stays on the calendar, marked, and can be brought back.
export async function setEventCancelled(id: string, cancelled: boolean): Promise<Result<void>> {
  await requirePermission("EVENTS")
  try {
    await prisma.calendarEvent.update({ where: { id }, data: { cancelledAt: cancelled ? new Date() : null } })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בעדכון מצב האירוע" })
  }
}

export async function deleteEvent(id: string): Promise<Result<void>> {
  await requirePermission("EVENTS")
  try {
    await prisma.calendarEvent.deleteMany({ where: { id } })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה במחיקת האירוע" })
  }
}

export async function createEventCategory(name: string): Promise<Result<{ id: string }>> {
  await requirePermission("EVENTS")
  const parsed = CategoryNameSchema.safeParse(name)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  try {
    const existing = await prisma.eventCategory.findMany({ select: { color: true, sortOrder: true } })
    const unusedColor = CATEGORY_COLORS.find((color) => !existing.some((category) => category.color === color))
    const category = await prisma.eventCategory.create({
      data: {
        name: parsed.data,
        color: unusedColor ?? CATEGORY_COLORS[existing.length % CATEGORY_COLORS.length],
        sortOrder: existing.reduce((max, category) => Math.max(max, category.sortOrder), 0) + 1,
      },
    })
    revalidatePath(PAGE)
    return ok({ id: category.id })
  } catch (error) {
    if (isDuplicate(error)) return err({ code: "DUPLICATE", message: "קטגוריה בשם הזה כבר קיימת" })
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת הקטגוריה" })
  }
}

export async function renameEventCategory(id: string, name: string): Promise<Result<void>> {
  await requirePermission("EVENTS")
  const parsed = CategoryNameSchema.safeParse(name)
  if (!parsed.success) return err({ code: "VALIDATION", message: parsed.error.errors[0].message })

  try {
    await prisma.eventCategory.update({ where: { id }, data: { name: parsed.data } })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch (error) {
    if (isDuplicate(error)) return err({ code: "DUPLICATE", message: "קטגוריה בשם הזה כבר קיימת" })
    return err({ code: "SERVER_ERROR", message: "שגיאה בשינוי שם הקטגוריה" })
  }
}

// A category that holds events cannot be removed, so no event is left without one.
export async function deleteEventCategory(id: string): Promise<Result<void>> {
  await requirePermission("EVENTS")
  try {
    const events = await prisma.calendarEvent.count({ where: { categoryId: id } })
    if (events > 0) return err({ code: "VALIDATION", message: `יש ${events} אירועים בקטגוריה הזו, ולכן אי אפשר למחוק אותה` })
    await prisma.eventCategory.deleteMany({ where: { id } })
    revalidatePath(PAGE)
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה במחיקת הקטגוריה" })
  }
}
