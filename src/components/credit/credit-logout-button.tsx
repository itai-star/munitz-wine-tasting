"use client"

import { useRouter } from "next/navigation"
import { logoutFromCredit } from "@/server/actions/credit-auth-actions"

export function CreditLogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await logoutFromCredit()
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="text-sm border border-stone-300 text-stone-700 px-4 py-2 rounded-lg hover:bg-stone-50 transition-colors"
    >
      יציאה
    </button>
  )
}
