import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { SessionList } from "@/components/admin/session-list"
import { AdminDashboardCards } from "@/components/admin/admin-dashboard-cards"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const sessions = await prisma.tastingSession.findMany({
    include: {
      wines: {
        include: { wine: true },
        orderBy: { order: "asc" },
      },
      _count: { select: { ratings: true, impressions: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div>
      <AdminDashboardCards />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-stone-800">טעימות</h1>
        <Link
          href="/admin/sessions/new"
          className="bg-wine text-white px-4 py-2 rounded-lg hover:bg-wine-dark transition-colors text-sm font-medium"
        >
          + טעימה חדשה
        </Link>
      </div>

      <SessionList sessions={sessions} />
    </div>
  )
}
