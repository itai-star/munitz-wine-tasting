"use client"

import { usePathname } from "next/navigation"
import { findActive } from "@/components/admin/admin-areas"

export function AdminHeaderTitle() {
  const pathname = usePathname()
  const active = findActive(pathname)
  const Icon = active?.area.icon
  const showCrumb = active && active.area.items.length > 1

  return (
    <div className="flex items-center gap-2 min-w-0 border-s border-white/25 ps-3">
      {Icon && <Icon className="w-5 h-5 shrink-0 text-white/85" />}
      <div className="min-w-0 leading-tight">
        {showCrumb && (
          <p className="text-[11px] text-white/70 truncate">{active.area.title}</p>
        )}
        <p className="text-base font-bold truncate">
          {showCrumb && <span className="md:hidden">{active.item.label}</span>}
          <span className={showCrumb ? "hidden md:inline" : undefined}>{active?.item.title ?? "ניהול"}</span>
        </p>
      </div>
    </div>
  )
}
