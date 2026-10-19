"use server"

import { prisma } from "@/lib/prisma"
import { encryptSecret } from "@/lib/encryption"
import { normalizeMac } from "@/lib/ecowitt"
import { fetchStationReadings, loadCredentials, saveStationSample } from "@/server/ecowitt-client"
import { ok, err } from "@/types"
import type { Result } from "@/types"
import { z } from "zod"

const SETTINGS_ID = "default"

const SaveKeysSchema = z.object({
  applicationKey: z.string().trim().min(1, "יש להזין Application Key"),
  apiKey: z.string().trim().min(1, "יש להזין API Key"),
})

export async function saveVineyardMonitorKeys(
  input: z.input<typeof SaveKeysSchema>
): Promise<Result<void>> {
  const parsed = SaveKeysSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  const data = {
    applicationKey: encryptSecret(parsed.data.applicationKey),
    apiKey: encryptSecret(parsed.data.apiKey),
  }

  try {
    await prisma.ecowittSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...data },
      update: data,
    })
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת המפתחות" })
  }
}

export async function deleteVineyardMonitorKeys(): Promise<Result<void>> {
  try {
    await prisma.ecowittSettings.deleteMany({ where: { id: SETTINGS_ID } })
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה במחיקת המפתחות" })
  }
}

export async function hasVineyardMonitorKeys(): Promise<boolean> {
  try {
    return (await prisma.ecowittSettings.count({ where: { id: SETTINGS_ID } })) > 0
  } catch {
    return false
  }
}

const StationFieldsSchema = z.object({
  name: z.string().trim().min(1, "יש להזין שם לתחנה").max(60),
  blockId: z.string().min(1).nullable(),
})

const CreateStationSchema = StationFieldsSchema.extend({
  mac: z.string().trim().min(1, "יש להזין כתובת MAC"),
})

// Verifies the MAC against Ecowitt before saving, so a typo never creates a dead station.
export async function createVineyardStation(
  input: z.input<typeof CreateStationSchema>
): Promise<Result<{ id: string }>> {
  const parsed = CreateStationSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }
  const mac = normalizeMac(parsed.data.mac)
  if (!mac) return err({ code: "VALIDATION", message: "כתובת MAC לא תקינה" })

  const credentials = await loadCredentials()
  if (!credentials.success) return credentials

  const readings = await fetchStationReadings(credentials.data, mac)
  if (!readings.success) return readings

  try {
    const station = await prisma.ecowittStation.create({
      data: { name: parsed.data.name, mac, blockId: parsed.data.blockId },
    })
    await saveStationSample(station.id, readings.data, new Date())
    return ok({ id: station.id })
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return err({ code: "DUPLICATE", message: "תחנה עם כתובת MAC הזו כבר קיימת" })
    }
    return err({ code: "SERVER_ERROR", message: "שגיאה בהוספת התחנה" })
  }
}

const UpdateStationSchema = StationFieldsSchema.extend({ id: z.string().min(1) })

export async function updateVineyardStation(
  input: z.input<typeof UpdateStationSchema>
): Promise<Result<void>> {
  const parsed = UpdateStationSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: parsed.error.errors[0].message })
  }

  const { id, name, blockId } = parsed.data
  try {
    await prisma.ecowittStation.update({ where: { id }, data: { name, blockId } })
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בעדכון התחנה" })
  }
}

export async function deleteVineyardStation(id: string): Promise<Result<void>> {
  try {
    await prisma.ecowittStation.delete({ where: { id } })
    return ok(undefined)
  } catch {
    return err({ code: "NOT_FOUND", message: "התחנה לא נמצאה" })
  }
}

const SensorLabelSchema = z.object({
  stationId: z.string().min(1),
  sensorKey: z.string().min(1),
  label: z.string().trim().max(60),
})

export async function saveVineyardSensorLabel(
  input: z.infer<typeof SensorLabelSchema>
): Promise<Result<void>> {
  const parsed = SensorLabelSchema.safeParse(input)
  if (!parsed.success) {
    return err({ code: "VALIDATION", message: "שם החיישן אינו תקין" })
  }

  const { stationId, sensorKey, label } = parsed.data
  try {
    if (label.length === 0) {
      await prisma.ecowittSensorLabel.deleteMany({ where: { stationId, sensorKey } })
    } else {
      await prisma.ecowittSensorLabel.upsert({
        where: { stationId_sensorKey: { stationId, sensorKey } },
        create: { stationId, sensorKey, label },
        update: { label },
      })
    }
    return ok(undefined)
  } catch {
    return err({ code: "SERVER_ERROR", message: "שגיאה בשמירת שם החיישן" })
  }
}
