"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { loginToCredit, setupCreditPassword } from "@/server/actions/credit-auth-actions"

const inputClass =
  "w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
const labelClass = "block text-sm font-medium text-stone-700 mb-1"
const buttonClass =
  "bg-wine text-white px-8 py-2.5 rounded-lg hover:bg-wine-dark transition-colors font-medium disabled:opacity-50"

export function CreditSetupForm({ minLength }: { minLength: number }) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    const result = await setupCreditPassword({ password, confirmation })
    setSubmitting(false)
    if (result.success) router.refresh()
    else setError(result.error.message)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 max-w-md space-y-4"
    >
      <p className="text-sm text-stone-600">
        זו הכניסה הראשונה למעקב האשראי. יש לבחור סיסמה, והיא תידרש בכל כניסה חדשה לאזור הזה.
        הסיסמה נשמרת מוצפנת ולא ניתן לשחזר אותה, רק לאפס אותה במסד הנתונים.
      </p>
      {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{error}</p>}
      <div>
        <label className={labelClass}>סיסמה (לפחות {minLength} תווים)</label>
        <input
          type="password"
          className={inputClass}
          autoComplete="new-password"
          dir="ltr"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div>
        <label className={labelClass}>אימות סיסמה</label>
        <input
          type="password"
          className={inputClass}
          autoComplete="new-password"
          dir="ltr"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
      </div>
      <button type="submit" disabled={submitting} className={buttonClass}>
        {submitting ? "שומר..." : "קבע סיסמה והיכנס"}
      </button>
    </form>
  )
}

export function CreditLoginForm() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    const result = await loginToCredit(password)
    setSubmitting(false)
    if (result.success) router.refresh()
    else setError(result.error.message)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 max-w-md space-y-4"
    >
      <p className="text-sm text-stone-600">אזור מעקב האשראי מוגן בסיסמה.</p>
      {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{error}</p>}
      <div>
        <label className={labelClass}>סיסמה</label>
        <input
          type="password"
          className={inputClass}
          autoComplete="current-password"
          dir="ltr"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button type="submit" disabled={submitting} className={buttonClass}>
        {submitting ? "בודק..." : "כניסה"}
      </button>
    </form>
  )
}
