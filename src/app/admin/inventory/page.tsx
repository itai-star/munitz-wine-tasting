import { prisma } from "@/lib/prisma"
import { getRecentWithdrawals } from "@/server/actions/inventory-actions"
import { InventoryScanner } from "@/components/admin/inventory-scanner"

export const dynamic = "force-dynamic"

export default async function InventoryPage() {
  const wines = await prisma.wine.findMany({
    select: { id: true, name: true, barcode: true, quantity: true },
    orderBy: { name: "asc" },
  })
  const withdrawalsResult = await getRecentWithdrawals()
  const recentWithdrawals = withdrawalsResult.success ? withdrawalsResult.data : []

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">ניהול מלאי</h1>
      <InventoryScanner wines={wines} recentWithdrawals={recentWithdrawals} />
    </div>
  )
}
