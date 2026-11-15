"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

const INTERVAL_MS = 10_000

// Reloads the data of the page every few seconds while it is in view, so the tasters see the next barrel as soon as it is
// chosen and the administrator sees the forms come in. What is typed into a form is kept.
export function AutoRefresh() {
  const router = useRouter()
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh()
    }, INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [router])
  return null
}
