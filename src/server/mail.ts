// Overridable through RESET_NOTICE_TO and MAIL_FROM; these are the agreed defaults.
const DEFAULT_RECIPIENT = "itai@munitz-winery.co.il"
const DEFAULT_SENDER = "יקב מוניץ - מערכת הניהול <onboarding@resend.dev>"

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

type MailAttachment = { filename: string; content: string }

type MailMessage = { subject: string; html: string; to?: string; attachments?: MailAttachment[] }

// Returns whether the message was handed to the mail service; without a key nothing is sent.
async function sendMail(message: MailMessage, timeoutMs: number): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return false

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM ?? DEFAULT_SENDER,
        to: [message.to ?? process.env.RESET_NOTICE_TO ?? DEFAULT_RECIPIENT],
        subject: message.subject,
        html: message.html,
        attachments: message.attachments,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    return response.ok
  } catch {
    return false
  }
}

// Returns whether the message was handed to the mail service. Without a key nothing is sent,
// and the request still appears on the users page.
export async function sendPasswordResetNotice(username: string, siteOrigin: string): Promise<boolean> {
  const safeName = escapeHtml(username)
  const usersPage = `${siteOrigin}/admin/users`

  return sendMail(
    {
      subject: "בקשה לאיפוס סיסמה - מערכת הניהול של יקב מוניץ",
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7">
<p>התקבלה בקשה לאיפוס סיסמה עבור המשתמש <b dir="ltr">${safeName}</b>.</p>
<p>כדי לקבוע סיסמה זמנית חדשה, יש להיכנס לעמוד ניהול המשתמשים ולבחור "איפוס סיסמה" ליד שם המשתמש:</p>
<p><a href="${usersPage}">${usersPage}</a></p>
<p>אם לא ציפית לבקשה הזו, אפשר להתעלם ממנה.</p>
</div>`,
    },
    8000,
  )
}

export type BackupMail = {
  dateLabel: string
  filename: string
  file: Buffer | null
  tables: { sheet: string; rows: number }[]
  note?: string
}

// The mail service accepts about 40 MB per message after encoding; the attachment is dropped above this size.
export const MAX_BACKUP_ATTACHMENT_BYTES = 25 * 1024 * 1024

export async function sendBackupMail(backup: BackupMail): Promise<boolean> {
  const rowsList = backup.tables.map((table) => `<li>${escapeHtml(table.sheet)}: ${table.rows}</li>`).join("")
  const attachment = backup.file ? [{ filename: backup.filename, content: backup.file.toString("base64") }] : undefined
  const note = backup.note ? `<p><b>${escapeHtml(backup.note)}</b></p>` : ""

  return sendMail(
    {
      subject: `גיבוי שבועי - מערכת הניהול של יקב מוניץ - ${backup.dateLabel}`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7">
<p>מצורף גיבוי של נתוני המערכת נכון ל-${escapeHtml(backup.dateLabel)}. בכל גליון בקובץ יש טבלה אחת, עם כל השורות והמזהים שלהן.</p>
${note}
<p>מספר השורות בכל טבלה:</p>
<ul>${rowsList}</ul>
<p>הקובץ לא כולל את נתוני החיישנים, נתוני האשראי, חשבונות המשתמשים והסיסמאות.</p>
<p>כדאי לשמור את הקובץ מחוץ לתיבת הדואר, בתיקייה שמגובה.</p>
</div>`,
      attachments: attachment,
    },
    30000,
  )
}
