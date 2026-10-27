"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { findActive, itemMatches, withVintage } from "@/components/admin/admin-areas"

// Phone-only row of chips for jumping between the screens of the current area.
export function AdminAreaTabs() {
  const pathname = usePathname()
  const vintageParam = useSearchParams().get("vintage")
  const active = findActive(pathname)
  const activeChip = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    activeChip.current?.scrollIntoView({ inline: "center", block: "nearest" })
  }, [pathname])

  if (!active || active.area.items.length < 2) return null

  return (
    <nav
      aria-label={active.area.title}
      className="md:hidden flex gap-2 overflow-x-auto px-3 py-2 bg-white border-b border-stone-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {active.area.items.map((item) => {
        const isActive = itemMatches(pathname, item)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={withVintage(item.href, vintageParam)}
            ref={isActive ? activeChip : undefined}
            aria-current={isActive ? "page" : undefined}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 min-h-10 text-sm font-medium border transition-colors ${
              isActive
                ? "bg-wine text-white border-wine"
                : "bg-stone-50 text-stone-700 border-stone-200"
            }`}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
