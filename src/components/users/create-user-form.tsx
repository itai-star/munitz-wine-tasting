"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  errorClass,
  inputClass,
  labelClass,
  noticeClass,
  postJson,
  primaryButtonClass,
} from "@/components/auth/auth-form-styles"
import { PermissionPicker } from "@/components/users/permission-picker"
import { generatePassword } from "@/lib/generate-password"
import {
  PASSWORD_RULES_TEXT,
  USERNAME_RULES_TEXT,
  checkPassword,
  checkUsername,
  normalizeUsername,
} from "@/lib/password-policy"
import type { PermissionKey, UserRoleKey } from "@/lib/permissions"

export function CreateUserForm() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRoleKey>("USER")
  const [permissions, setPermissions] = useState<PermissionKey[]>([])
  const [error, setError] = useState("")
  const [created, setCreated] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    setCreated("")
    const invalid = checkUsername(normalizeUsername(username)) ?? checkPassword(password)
    if (invalid) return setError(invalid)

    setSubmitting(true)
    const answer = await postJson("/api/admin/users", { username, password, role, permissions })
    setSubmitting(false)
    if (!answer.ok) return setError(answer.error ?? "שגיאה ביצירת המשתמש")

    setCreated(`המשתמש ${normalizeUsername(username)} נוצר. הסיסמה זמנית, והוא יתבקש להחליף אותה בכניסה הראשונה.`)
    setUsername("")
    setPassword("")
    setRole("USER")
    setPermissions([])
    router.refresh()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 space-y-4"
    >
      <h2 className="font-semibold text-stone-800">משתמש חדש</h2>
      {created && (
        <p role="status" className={noticeClass}>
          {created}
        </p>
      )}
      {error && (
        <p role="alert" className={errorClass}>
          {error}
        </p>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="new-username" className={labelClass}>
            שם משתמש
          </label>
          <input
            id="new-username"
            className={inputClass}
            dir="ltr"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <p className="text-xs text-stone-500 mt-1">{USERNAME_RULES_TEXT}</p>
        </div>
        <div>
          <label htmlFor="new-user-password" className={labelClass}>
            סיסמה זמנית
          </label>
          <div className="flex gap-2">
            <input
              id="new-user-password"
              className={`${inputClass} min-w-0`}
              dir="ltr"
              autoComplete="off"
              spellCheck={false}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setPassword(generatePassword())}
              className="shrink-0 whitespace-nowrap border border-stone-300 rounded-lg px-3 text-sm text-stone-700 hover:bg-stone-50"
            >
              יצירה אוטומטית
            </button>
          </div>
          <p className="text-xs text-stone-500 mt-1">{PASSWORD_RULES_TEXT}</p>
        </div>
      </div>
      <PermissionPicker
        role={role}
        permissions={permissions}
        onRoleChange={setRole}
        onPermissionsChange={setPermissions}
      />
      <button type="submit" disabled={submitting || !username || !password} className={primaryButtonClass}>
        {submitting ? "יוצר..." : "יצירת משתמש"}
      </button>
    </form>
  )
}
