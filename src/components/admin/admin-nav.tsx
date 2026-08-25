"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { adminNavItems, isAdminNavItemActive } from "@/components/admin/admin-nav-items"

export function AdminNav() {
  const pathname = usePathname()

  return (
    <>
      <nav className="hidden md:flex items-center gap-1">
        {adminNavItems.map((item) => {
          const active = isAdminNavItemActive(pathname, item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-white/15 text-white font-medium"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 flex bg-wine border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        {adminNavItems.map((item) => {
          const active = isAdminNavItemActive(pathname, item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
                active ? "text-white" : "text-white/60"
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
