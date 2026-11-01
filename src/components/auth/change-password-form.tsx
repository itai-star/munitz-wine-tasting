"use client"

import { useState } from "react"
import {
  errorClass,
  inputClass,
  labelClass,
  noticeClass,
  postJson,
  primaryButtonClass,
} from "@/components/auth/auth-form-styles"
import { PASSWORD_RULES_TEXT, checkPassword } from "@/lib/password-policy"

export function ChangePasswordForm({ mustChange }: { mustChange: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    const policyError = checkPassword(newPassword)
    if (policyError) return setError(policyError)
    if (newPassword !== confirmation) return setError("הסיסמאות החדשות אינן זהות")

    setSubmitting(true)
    const answer = await postJson("/api/auth/change-password", { currentPassword, newPassword })
    if (answer.ok) {
      // A full load, so the screens that were locked until the change open for this user.
      if (mustChange) window.location.assign("/admin")
      else {
        setDone(true)
        setSubmitting(false)
        setCurrentPassword("")
        setNewPassword("")
        setConfirmation("")
      }
      return
    }
    setSubmitting(false)
    setError(answer.error ?? "שגיאה בשינוי הסיסמה")
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 max-w-md space-y-4"
    >
      <h2 className="font-semibold text-stone-800">{mustChange ? "קביעת סיסמה חדשה" : "שינוי סיסמה"}</h2>
      {mustChange && (
        <p className="text-sm text-amber-800 bg-amber-50 px-3 py-2 rounded">
          הסיסמה הנוכחית היא סיסמה זמנית. יש לבחור סיסמה חדשה כדי להמשיך.
        </p>
      )}
      {done && (
        <p role="status" className={noticeClass}>
          הסיסמה שונתה. שאר ההתחברויות שלך במכשירים אחרים נותקו.
        </p>
      )}
      {error && (
        <p role="alert" className={errorClass}>
          {error}
        </p>
      )}
      <div>
        <label htmlFor="current-password" className={labelClass}>
          סיסמה נוכחית
        </label>
        <input
          id="current-password"
          type="password"
          className={inputClass}
          dir="ltr"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="new-password" className={labelClass}>
          סיסמה חדשה
        </label>
        <input
          id="new-password"
          type="password"
          className={inputClass}
          dir="ltr"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <p className="text-xs text-stone-500 mt-1">{PASSWORD_RULES_TEXT}</p>
      </div>
      <div>
        <label htmlFor="confirmation" className={labelClass}>
          אימות סיסמה חדשה
        </label>
        <input
          id="confirmation"
          type="password"
          className={inputClass}
          dir="ltr"
          autoComplete="new-password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
      </div>
      <button
        type="submit"
        disabled={submitting || !currentPassword || !newPassword}
        className={primaryButtonClass}
      >
        {submitting ? "שומר..." : "שמירת הסיסמה"}
      </button>
    </form>
  )
}
