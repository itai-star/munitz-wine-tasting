"use client"

import { useState } from "react"
import Link from "next/link"
import {
  errorClass,
  inputClass,
  labelClass,
  noticeClass,
  postJson,
  primaryButtonClass,
} from "@/components/auth/auth-form-styles"

export function ForgotPasswordForm() {
  const [username, setUsername] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    const answer = await postJson("/api/auth/forgot-password", { username })
    setSubmitting(false)
    if (answer.ok) setNotice(answer.message ?? "הבקשה נשלחה")
    else setError(answer.error ?? "שגיאה בשליחת הבקשה")
  }

  if (notice) {
    return (
      <div className="space-y-4">
        <p role="status" className={noticeClass}>
          {notice}
        </p>
        <p className="text-center">
          <Link href="/login" className="text-sm text-wine hover:underline">
            חזרה לכניסה
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-stone-600">
        יש להזין את שם המשתמש. תישלח בקשה לאיפוס הסיסמה למנהל המערכת, והוא יעביר לך סיסמה זמנית.
      </p>
      {error && (
        <p role="alert" className={errorClass}>
          {error}
        </p>
      )}
      <div>
        <label htmlFor="username" className={labelClass}>
          שם משתמש
        </label>
        <input
          id="username"
          className={inputClass}
          dir="ltr"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <button type="submit" disabled={submitting || !username.trim()} className={`${primaryButtonClass} w-full`}>
        {submitting ? "שולח..." : "שליחת בקשה לאיפוס"}
      </button>
      <p className="text-center">
        <Link href="/login" className="text-sm text-wine hover:underline">
          חזרה לכניסה
        </Link>
      </p>
    </form>
  )
}
