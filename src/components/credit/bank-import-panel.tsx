"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { importCreditFromBank } from "@/server/actions/credit-bank-actions"

const inputClass =
  "w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
const labelClass = "block text-xs text-stone-500 mb-1"

export function BankImportPanel() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleImport(event: React.FormEvent) {
    event.preventDefault()
    const credentials = { username, password }
    // The fields are cleared before the request starts, so the password never lingers in the page.
    setUsername("")
    setPassword("")
    setRunning(true)
    setMessage(null)

    const result = await importCreditFromBank(credentials)
    setRunning(false)
    if (result.success) {
      const { added, skipped, cards, months } = result.data
      setMessage({
        type: "success",
        text: `נשלפו ${cards} כרטיסים ב-${months} חודשי חיוב: נוספו ${added} עסקאות חדשות, ${skipped} כבר היו שמורות.`,
      })
      router.refresh()
    } else {
      setMessage({ type: "error", text: result.error.message })
    }
  }

  return (
    <form
      onSubmit={handleImport}
      className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 grid gap-4 sm:grid-cols-2"
    >
      <p className="sm:col-span-2 text-sm text-stone-600">
        נפתח דפדפן, ההתחברות לבנק מתבצעת בו, והעסקאות נשמרות באפליקציה. שם המשתמש והסיסמה משמשים
        להרצה הזו בלבד ולא נשמרים בשום מקום. אם הבנק מבקש קוד SMS, יש לבחור טלפון ולהקליד אותו
        בחלון הדפדפן שנפתח, והמשיכה תמשיך לבד.
      </p>
      {message && (
        <p
          className={`sm:col-span-2 text-sm px-3 py-2 rounded ${
            message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}
      <div>
        <label className={labelClass}>שם משתמש בבנק</label>
        <input
          className={inputClass}
          dir="ltr"
          autoComplete="off"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={running}
        />
      </div>
      <div>
        <label className={labelClass}>סיסמה בבנק</label>
        <input
          type="password"
          className={inputClass}
          dir="ltr"
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={running}
        />
      </div>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={running || !username || !password}
          className="bg-wine text-white px-8 py-2.5 rounded-lg hover:bg-wine-dark transition-colors font-medium disabled:opacity-50"
        >
          {running ? "מושך נתונים מהבנק... אל תסגור את חלון הדפדפן" : "משוך מהבנק"}
        </button>
      </div>
    </form>
  )
}
