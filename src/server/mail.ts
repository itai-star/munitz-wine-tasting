// Overridable through RESET_NOTICE_TO and MAIL_FROM; these are the agreed defaults.
const DEFAULT_RECIPIENT = "itai@munitz-winery.co.il"
const DEFAULT_SENDER = "יקב מוניץ - מערכת הניהול <onboarding@resend.dev>"

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

// Returns whether the message was handed to the mail service. Without a key nothing is sent,
// and the request still appears on the users page.
export async function sendPasswordResetNotice(username: string, siteOrigin: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return false

  const safeName = escapeHtml(username)
  const usersPage = `${siteOrigin}/admin/users`

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM ?? DEFAULT_SENDER,
        to: [process.env.RESET_NOTICE_TO ?? DEFAULT_RECIPIENT],
        subject: "בקשה לאיפוס סיסמה - מערכת הניהול של יקב מוניץ",
        html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7">
<p>התקבלה בקשה לאיפוס סיסמה עבור המשתמש <b dir="ltr">${safeName}</b>.</p>
<p>כדי לקבוע סיסמה זמנית חדשה, יש להיכנס לעמוד ניהול המשתמשים ולבחור "איפוס סיסמה" ליד שם המשתמש:</p>
<p><a href="${usersPage}">${usersPage}</a></p>
<p>אם לא ציפית לבקשה הזו, אפשר להתעלם ממנה.</p>
</div>`,
      }),
      signal: AbortSignal.timeout(8000),
    })
    return response.ok
  } catch {
    return false
  }
}
