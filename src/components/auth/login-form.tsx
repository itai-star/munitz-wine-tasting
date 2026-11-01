"use client"

import { useState } from "react"
import Link from "next/link"
import {
  errorClass,
  inputClass,
  labelClass,
  postJson,
  primaryButtonClass,
} from "@/components/auth/auth-form-styles"

export function LoginForm({ next }: { next: string }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    const answer = await postJson("/api/auth/login", { username, password, next })
    if (answer.ok && answer.redirect) {
      // A full load, so every part of the page is rendered for the signed-in user.
      window.location.assign(answer.redirect)
      return
    }
    setSubmitting(false)
    setError(answer.error ?? "שגיאה בכניסה")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
      <div>
        <label htmlFor="password" className={labelClass}>
          סיסמה
        </label>
        <input
          id="password"
          type="password"
          className={inputClass}
          dir="ltr"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button type="submit" disabled={submitting || !username || !password} className={`${primaryButtonClass} w-full`}>
        {submitting ? "נכנס..." : "כניסה"}
      </button>
      <p className="text-center">
        <Link href="/forgot-password" className="text-sm text-wine hover:underline">
          שכחתי סיסמה
        </Link>
      </p>
    </form>
  )
}
