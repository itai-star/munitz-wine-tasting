import { NextResponse } from "next/server"
import { buildBackupWorkbook } from "@/server/backup-export"
import { MAX_BACKUP_ATTACHMENT_BYTES, sendBackupMail } from "@/server/mail"

export const maxDuration = 60

const ISRAEL_TIME_ZONE = "Asia/Jerusalem"

function isoDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ISRAEL_TIME_ZONE }).format(date)
}

export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { buffer, counts } = await buildBackupWorkbook()
    const day = isoDay(new Date())
    const tooLarge = buffer.length > MAX_BACKUP_ATTACHMENT_BYTES

    const sent = await sendBackupMail({
      dateLabel: day,
      filename: `munitz-backup-${day}.xlsx`,
      file: tooLarge ? null : buffer,
      tables: counts,
      note: tooLarge ? "הקובץ גדול מדי לשליחה במייל ולכן לא צורף. יש להגדיר דרך אחרת לגיבוי הנתונים." : undefined,
    })
    if (!sent) return NextResponse.json({ error: "The backup mail was not sent" }, { status: 502 })

    return NextResponse.json({ ok: true, bytes: buffer.length, attached: !tooLarge, tables: counts.length })
  } catch (error) {
    console.error("Weekly backup failed", error)
    return NextResponse.json({ error: "Backup failed" }, { status: 500 })
  }
}
