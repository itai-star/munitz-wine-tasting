"use client"

import { useState } from "react"
import { postJson } from "@/components/auth/auth-form-styles"

export function LogoutButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false)

  async function handleClick() {
    setBusy(true)
    await postJson("/api/auth/logout", {})
    window.location.assign("/login")
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={
        className ??
        "border border-stone-300 text-stone-700 px-6 py-2.5 rounded-lg hover:bg-stone-50 transition-colors font-medium disabled:opacity-50"
      }
    >
      {busy ? "יוצא..." : "יציאה"}
    </button>
  )
}
