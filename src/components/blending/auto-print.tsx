"use client"

import { useEffect } from "react"

// Opens the print dialog, where the report can be saved as a PDF, once the page has drawn.
export function AutoPrint({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return
    const timer = window.setTimeout(() => window.print(), 600)
    return () => window.clearTimeout(timer)
  }, [enabled])
  return null
}
