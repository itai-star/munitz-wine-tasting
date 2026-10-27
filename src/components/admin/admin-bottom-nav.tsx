"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { adminAreas, findActive, withVintage } from "@/components/admin/admin-areas"

export function AdminBottomNav() {
  const pathname = usePathname()
  const vintageParam = useSearchParams().get("vintage")
  const activeAreaId = findActive(pathname)?.area.id

  return (
    <nav
      aria-label="אזורי האפליקציה"
      className="md:hidden print:hidden fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 bg-wine border-t border-white/10 pb-[env(safe-area-inset-bottom)]"
    >
      {adminAreas.map((area) => {
        const isActive = area.id === activeAreaId
        const Icon = area.icon
        return (
          <Link
            key={area.id}
            href={withVintage(area.href, vintageParam)}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex flex-col items-center justify-center gap-1 min-h-[3.75rem] px-0.5 text-[10.5px] leading-tight text-center transition-colors ${
              isActive ? "text-white font-semibold" : "text-white/65 active:text-white"
            }`}
          >
            {isActive && (
              <span className="absolute top-0 h-[3px] w-9 rounded-b-full bg-white" aria-hidden="true" />
            )}
            <Icon className="w-6 h-6" />
            {area.label}
          </Link>
        )
      })}
    </nav>
  )
}
