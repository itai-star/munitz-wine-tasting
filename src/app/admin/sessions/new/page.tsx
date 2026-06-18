import { prisma } from "@/lib/prisma"
import { NewSessionForm } from "@/components/admin/new-session-form"

export const dynamic = "force-dynamic"

export default async function NewSessionPage() {
  const wines = await prisma.wine.findMany({
    orderBy: { name: "asc" },
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">טעימה חדשה</h1>
      {wines.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-stone-200">
          <p className="text-stone-500 text-lg mb-2">אין יינות במערכת</p>
          <p className="text-stone-400 text-sm">
            יש להוסיף יינות לפני יצירת טעימה
          </p>
          <a
            href="/admin/wines"
            className="inline-block mt-4 text-wine underline text-sm"
          >
            עבור לניהול יינות
          </a>
        </div>
      ) : (
        <NewSessionForm wines={wines} />
      )}
    </div>
  )
}
