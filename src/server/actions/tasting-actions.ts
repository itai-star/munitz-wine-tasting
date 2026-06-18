"use server"

import { prisma } from "@/lib/prisma"
import { ok, err } from "@/types"
import type { Result, AppError } from "@/types"
import { z } from "zod"

const SubmitRatingSchema = z.object({
  sessionWineId: z.string().min(1),
  sessionId: z.string().min(1),
  participantName: z.string().min(1, "שם המשתתף נדרש"),
  score: z.number().int().min(1).max(10),
  notes: z.string().nullable(),
})

const SubmitImpressionSchema = z.object({
  sessionId: z.string().min(1),
  participantName: z.string().min(1, "שם המשתתף נדרש"),
  text: z.string().min(1, "יש לכתוב התרשמות"),
})

export async function submitRating(input: z.infer<typeof SubmitRatingSchema>): Promise<Result<{ id: string }>> {
  const parsed = SubmitRatingSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  try {
    const session = await prisma.tastingSession.findUnique({
      where: { id: parsed.data.sessionId },
    })
    if (!session?.isActive) {
      return err({ code: "VALIDATION", message: "הטעימה אינה פעילה" })
    }

    const rating = await prisma.rating.upsert({
      where: {
        sessionWineId_participantName: {
          sessionWineId: parsed.data.sessionWineId,
          participantName: parsed.data.participantName,
        },
      },
      update: {
        score: parsed.data.score,
        notes: parsed.data.notes,
      },
      create: {
        sessionWineId: parsed.data.sessionWineId,
        sessionId: parsed.data.sessionId,
        participantName: parsed.data.participantName,
        score: parsed.data.score,
        notes: parsed.data.notes,
      },
    })
    return ok({ id: rating.id })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת הדירוג" })
  }
}

export async function submitImpression(input: z.infer<typeof SubmitImpressionSchema>): Promise<Result<{ id: string }>> {
  const parsed = SubmitImpressionSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  try {
    const impression = await prisma.impression.upsert({
      where: {
        sessionId_participantName: {
          sessionId: parsed.data.sessionId,
          participantName: parsed.data.participantName,
        },
      },
      update: { text: parsed.data.text },
      create: {
        sessionId: parsed.data.sessionId,
        participantName: parsed.data.participantName,
        text: parsed.data.text,
      },
    })
    return ok({ id: impression.id })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת ההתרשמות" })
  }
}

export async function getSessionSummary(sessionId: string, participantName: string): Promise<Result<SessionSummary, AppError>> {
  try {
    const session = await prisma.tastingSession.findUnique({
      where: { id: sessionId },
      include: {
        wines: {
          include: { wine: true },
          orderBy: { order: "asc" },
        },
        ratings: {
          where: { participantName },
        },
        impressions: {
          where: { participantName },
        },
      },
    })

    if (!session) {
      return err({ code: "NOT_FOUND", message: "הטעימה לא נמצאה" })
    }

    const allRatings = await prisma.rating.findMany({
      where: { sessionId },
    })

    const winesSummary = session.wines.map((sw) => {
      const myRating = session.ratings.find((r) => r.sessionWineId === sw.id)
      const allWineRatings = allRatings.filter((r) => r.sessionWineId === sw.id)
      const avgScore = allWineRatings.length > 0
        ? allWineRatings.reduce((sum, r) => sum + r.score, 0) / allWineRatings.length
        : 0

      return {
        wineName: sw.wine.name,
        wineYear: sw.wine.year,
        wineType: sw.wine.type,
        myScore: myRating?.score ?? null,
        myNotes: myRating?.notes ?? null,
        avgScore: Math.round(avgScore * 10) / 10,
        totalRatings: allWineRatings.length,
      }
    })

    const impression = session.impressions[0]?.text ?? null

    return ok({
      sessionName: session.name,
      sessionDate: session.date.toISOString(),
      participantName,
      wines: winesSummary,
      impression,
    })
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה ביצירת הסיכום" })
  }
}

type SessionSummary = {
  sessionName: string
  sessionDate: string
  participantName: string
  wines: {
    wineName: string
    wineYear: number | null
    wineType: string | null
    myScore: number | null
    myNotes: string | null
    avgScore: number
    totalRatings: number
  }[]
  impression: string | null
}
