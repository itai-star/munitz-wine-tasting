import { AdminHeader } from "@/components/admin/admin-header"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminBottomNav } from "@/components/admin/admin-bottom-nav"
import { AdminQuickAdd } from "@/components/admin/admin-quick-add"

// The header reads the vintages and the URL on every request, so nothing here can be prerendered.
export const dynamic = "force-dynamic"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader />
      <div className="flex-1 flex">
        <AdminSidebar />
        <main className="flex-1 min-w-0 max-w-5xl mx-auto w-full px-4 py-6 pb-32 md:pb-8 md:px-8 print:p-0">
          {children}
        </main>
      </div>
      <AdminQuickAdd />
      <AdminBottomNav />
    </div>
  )
}
