import Link from "next/link"
import { adminNavItems } from "@/components/admin/admin-nav-items"

export function AdminDashboardCards() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
      {adminNavItems.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col gap-2 bg-white rounded-xl shadow-sm border border-stone-200 p-4 hover:border-wine/40 hover:shadow-md transition-all"
          >
            <Icon className="w-6 h-6 text-wine" />
            <div>
              <p className="font-semibold text-stone-800">{item.label}</p>
              <p className="text-xs text-stone-500 mt-0.5">{item.description}</p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
