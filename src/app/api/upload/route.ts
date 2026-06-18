import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { randomUUID } from "crypto"

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

const MAGIC_BYTES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
}

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const expected = MAGIC_BYTES[mimeType]
  if (!expected) return false
  for (let i = 0; i < expected.length; i++) {
    if (buffer[i] !== expected[i]) return false
  }
  return true
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 })
    }

    const ext = MIME_TO_EXT[file.type]
    if (!ext) {
      return NextResponse.json(
        { error: "סוג קובץ לא נתמך. השתמשו ב-JPG, PNG או WebP" },
        { status: 400 }
      )
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "הקובץ גדול מדי. מקסימום 5MB" },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    if (!validateMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        { error: "תוכן הקובץ לא תואם לסוג שנשלח" },
        { status: 400 }
      )
    }

    const fileName = `wines/${randomUUID()}.${ext}`

    const blob = await put(fileName, buffer, {
      access: "public",
      contentType: file.type,
    })

    return NextResponse.json({ url: blob.url })
  } catch (e) {
    const message = e instanceof Error ? e.message : "שגיאה לא ידועה"
    console.error("Upload error:", message)
    return NextResponse.json(
      { error: `שגיאה בהעלאת הקובץ: ${message}` },
      { status: 500 }
    )
  }
}
