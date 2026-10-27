"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { adminAreas, findActive, itemMatches, withVintage } from "@/components/admin/admin-areas"

export function AdminSidebar() {
  const pathname = usePathname()
  const vintageParam = useSearchParams().get("vintage")
  const activeAreaId = findActive(pathname)?.area.id

  return (
    <aside className="hidden md:block print:hidden w-60 shrink-0 border-e border-stone-200 bg-white">
      <nav
        aria-label="אזורי האפליקציה"
        className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto p-3 space-y-1"
      >
        {adminAreas.map((area) => {
          const isActiveArea = area.id === activeAreaId
          const Icon = area.icon
          const showItems = isActiveArea && area.items.length > 1
          return (
            <div key={area.id}>
              <Link
                href={withVintage(area.href, vintageParam)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActiveArea && !showItems
                    ? "bg-wine-soft text-wine"
                    : isActiveArea
                      ? "text-wine"
                      : "text-stone-700 hover:bg-stone-50"
                }`}
              >
                <Icon className="w-5 h-5" />
                {area.label}
              </Link>
              {showItems && (
                <ul className="mt-0.5 mb-2 me-4 border-e-2 border-stone-100 pe-2 space-y-0.5">
                  {area.items.map((item) => {
                    const isActive = itemMatches(pathname, item)
                    const ItemIcon = item.icon
                    return (
                      <li key={item.href}>
                        <Link
                          href={withVintage(item.href, vintageParam)}
                          aria-current={isActive ? "page" : undefined}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                            isActive
                              ? "bg-wine-soft text-wine font-semibold"
                              : "text-stone-600 hover:bg-stone-50"
                          }`}
                        >
                          <ItemIcon className="w-4 h-4" />
                          {item.label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
