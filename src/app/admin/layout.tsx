import { redirect } from "next/navigation"
import { AdminHeader } from "@/components/admin/admin-header"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminBottomNav } from "@/components/admin/admin-bottom-nav"
import { AdminQuickAdd } from "@/components/admin/admin-quick-add"
import { AdminAccessProvider } from "@/components/admin/admin-access"
import { getCurrentUser } from "@/server/auth/session"

// The header reads the vintages and the URL on every request, so nothing here can be prerendered.
export const dynamic = "force-dynamic"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  return (
    <AdminAccessProvider user={user}>
      <div className="flex-1 flex flex-col">
        <AdminHeader username={user.username} />
        <div className="flex-1 flex">
          <AdminSidebar />
          <main className="flex-1 min-w-0 max-w-5xl mx-auto w-full px-4 py-6 pb-20 md:pb-8 md:px-8 print:p-0">
            {children}
          </main>
        </div>
        <AdminQuickAdd />
        <AdminBottomNav />
      </div>
    </AdminAccessProvider>
  )
}
