import { redirect } from "next/navigation"
import { ChangePasswordForm } from "@/components/auth/change-password-form"
import { LogoutButton } from "@/components/auth/logout-button"
import { PERMISSIONS, PERMISSION_LABELS, canUse } from "@/lib/permissions"
import { getCurrentUser } from "@/server/auth/session"

export const dynamic = "force-dynamic"

export default async function AccountPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const allowed = PERMISSIONS.filter((permission) => canUse(user, permission))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">החשבון שלי</h1>

      <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 max-w-md space-y-2">
        <p className="text-sm text-stone-500">
          שם משתמש: <b className="text-stone-800" dir="ltr">{user.username}</b>
        </p>
        <p className="text-sm text-stone-500">
          תפקיד: <b className="text-stone-800">{user.role === "ADMIN" ? "מנהל" : "משתמש"}</b>
        </p>
        <p className="text-sm text-stone-500">
          גישה ל: {allowed.length > 0 ? allowed.map((permission) => PERMISSION_LABELS[permission]).join(", ") : "אין הרשאות"}
        </p>
      </section>

      <ChangePasswordForm mustChange={user.mustChangePassword} />

      <LogoutButton />
    </div>
  )
}
