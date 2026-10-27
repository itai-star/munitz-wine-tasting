"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { primaryActionFor } from "@/components/admin/admin-actions"
import { PlusIcon } from "@/components/admin/nav-icons"
import { withVintage } from "@/components/admin/admin-areas"

const FAB_BASE_CLASS =
  "md:hidden print:hidden fixed z-30 end-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] inline-flex items-center gap-2 h-12 ps-4 pe-5 rounded-full bg-wine text-white text-sm font-semibold shadow-lg shadow-black/25 active:bg-wine-dark transition-all duration-200"
const SCROLL_THRESHOLD_PX = 8
const ALWAYS_VISIBLE_BELOW_PX = 120

function isFormField(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
}

// Phone-only floating button with the main "create" action of the current screen.
export function AdminQuickAdd() {
  const pathname = usePathname()
  const vintageParam = useSearchParams().get("vintage")
  const [open, setOpen] = useState(false)
  const [tucked, setTucked] = useState(false)
  const action = primaryActionFor(pathname)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // The button steps out of the way while scrolling down or typing, so it never covers
  // the form buttons or the text being read.
  useEffect(() => {
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (y < ALWAYS_VISIBLE_BELOW_PX || y < lastY - SCROLL_THRESHOLD_PX) setTucked(false)
      else if (y > lastY + SCROLL_THRESHOLD_PX) setTucked(true)
      lastY = y
    }
    const onFocusIn = (event: FocusEvent) => {
      if (isFormField(event.target)) setTucked(true)
    }
    const onFocusOut = (event: FocusEvent) => {
      if (isFormField(event.target)) setTucked(false)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    document.addEventListener("focusin", onFocusIn)
    document.addEventListener("focusout", onFocusOut)
    return () => {
      window.removeEventListener("scroll", onScroll)
      document.removeEventListener("focusin", onFocusIn)
      document.removeEventListener("focusout", onFocusOut)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  if (!action) return null

  const fabClass = `${FAB_BASE_CLASS} ${tucked ? "translate-y-24 opacity-0 pointer-events-none" : ""}`

  if (action.kind === "link") {
    return (
      <Link href={action.href} className={fabClass}>
        <PlusIcon className="w-5 h-5" />
        {action.label}
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={fabClass}
      >
        <PlusIcon className="w-5 h-5" />
        {action.label}
      </button>

      {open && (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={action.title}>
          <button
            type="button"
            aria-label="סגור"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/45"
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-stone-200" aria-hidden="true" />
            <p className="mb-2 text-sm font-semibold text-stone-500">{action.title}</p>
            <ul>
              {action.actions.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={withVintage(item.href, vintageParam)}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-4 min-h-14 rounded-xl px-2 text-base font-medium text-stone-800 active:bg-stone-50"
                    >
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-wine-soft text-wine">
                        <Icon className="w-5 h-5" />
                      </span>
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
