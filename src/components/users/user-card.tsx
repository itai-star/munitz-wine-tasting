"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { errorClass, inputClass, noticeClass, postJson } from "@/components/auth/auth-form-styles"
import { PermissionPicker } from "@/components/users/permission-picker"
import { generatePassword } from "@/lib/generate-password"
import { PASSWORD_RULES_TEXT, checkPassword } from "@/lib/password-policy"
import type { PermissionKey, UserRoleKey } from "@/lib/permissions"
import { deleteUser, updateUser } from "@/server/actions/user-actions"
import type { ManagedUser } from "@/server/actions/user-actions"

const smallButton =
  "border border-stone-300 rounded-lg px-3 min-h-10 text-sm text-stone-700 hover:bg-stone-50 disabled:opacity-50"

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "numeric" }) : "עדיין לא נכנס"
}

export function UserCard({ user, isSelf }: { user: ManagedUser; isSelf: boolean }) {
  const router = useRouter()
  const [role, setRole] = useState<UserRoleKey>(user.role)
  const [permissions, setPermissions] = useState<PermissionKey[]>(user.permissions)
  const [isActive, setIsActive] = useState(user.isActive)
  const [resetPassword, setResetPassword] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const changed =
    role !== user.role ||
    isActive !== user.isActive ||
    [...permissions].sort().join() !== [...user.permissions].sort().join()

  function report(nextError: string, nextMessage = "") {
    setError(nextError)
    setMessage(nextMessage)
  }

  async function handleSave() {
    setBusy(true)
    const result = await updateUser({ id: user.id, role, permissions, isActive })
    setBusy(false)
    if (!result.success) return report(result.error.message)
    report("", "השינויים נשמרו")
    router.refresh()
  }

  async function handleDelete() {
    if (!window.confirm(`למחוק את המשתמש ${user.username}? אי אפשר לבטל את הפעולה.`)) return
    setBusy(true)
    const result = await deleteUser(user.id)
    setBusy(false)
    if (!result.success) return report(result.error.message)
    router.refresh()
  }

  async function handleReset() {
    if (resetPassword === null) return
    const invalid = checkPassword(resetPassword)
    if (invalid) return report(invalid)

    setBusy(true)
    const answer = await postJson(`/api/admin/users/${user.id}/password`, { password: resetPassword })
    setBusy(false)
    if (!answer.ok) return report(answer.error ?? "שגיאה באיפוס הסיסמה")
    report("", "הסיסמה אופסה. יש להעביר למשתמש את הסיסמה הזמנית, והוא יחליף אותה בכניסה הבאה.")
    setResetPassword(null)
    router.refresh()
  }

  return (
    <article className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 space-y-4">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="font-semibold text-stone-800" dir="ltr">
          {user.username}
        </h3>
        {isSelf && <span className="text-xs bg-wine-soft text-wine rounded-full px-2 py-0.5">אתה</span>}
        {!isActive && <span className="text-xs bg-stone-200 text-stone-700 rounded-full px-2 py-0.5">מושבת</span>}
        {user.mustChangePassword && (
          <span className="text-xs bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">ממתין להחלפת סיסמה</span>
        )}
        <span className="text-xs text-stone-500 ms-auto">כניסה אחרונה: {formatDate(user.lastLoginAt)}</span>
      </header>

      {message && (
        <p role="status" className={noticeClass}>
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className={errorClass}>
          {error}
        </p>
      )}

      <PermissionPicker
        role={role}
        permissions={permissions}
        disabled={isSelf}
        onRoleChange={setRole}
        onPermissionsChange={setPermissions}
      />

      {!isSelf && (
        <label className="inline-flex items-center gap-2 min-h-10 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          חשבון פעיל (משתמש מושבת לא יכול להיכנס)
        </label>
      )}

      {resetPassword !== null && (
        <div className="space-y-2 border-t border-stone-100 pt-3">
          <div className="flex gap-2">
            <input
              className={`${inputClass} min-w-0`}
              dir="ltr"
              autoComplete="off"
              spellCheck={false}
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              aria-label="סיסמה זמנית חדשה"
            />
            <button type="button" onClick={() => setResetPassword(generatePassword())} className={`${smallButton} shrink-0 whitespace-nowrap`}>
              יצירה אוטומטית
            </button>
          </div>
          <p className="text-xs text-stone-500">{PASSWORD_RULES_TEXT}</p>
          <div className="flex gap-2">
            <button type="button" onClick={handleReset} disabled={busy || !resetPassword} className={smallButton}>
              קביעת הסיסמה הזמנית
            </button>
            <button type="button" onClick={() => setResetPassword(null)} className={smallButton}>
              ביטול
            </button>
          </div>
        </div>
      )}

      <footer className="flex flex-wrap gap-2 border-t border-stone-100 pt-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || !changed}
          className="bg-wine text-white rounded-lg px-4 min-h-10 text-sm font-medium hover:bg-wine-dark disabled:opacity-40"
        >
          שמירת שינויים
        </button>
        {!isSelf && resetPassword === null && (
          <button type="button" onClick={() => setResetPassword(generatePassword())} className={smallButton}>
            איפוס סיסמה
          </button>
        )}
        {!isSelf && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="border border-red-200 text-red-700 rounded-lg px-3 min-h-10 text-sm hover:bg-red-50 disabled:opacity-50 ms-auto"
          >
            מחיקת משתמש
          </button>
        )}
      </footer>
    </article>
  )
}
