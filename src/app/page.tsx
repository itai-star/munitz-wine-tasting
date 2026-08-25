import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const activeSessions = await prisma.tastingSession.findMany({
    where: { isActive: true },
    include: {
      wines: { include: { wine: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <main className="flex-1">
      <header className="bg-wine text-white py-10 text-center">
        <Image
          src="/logo.png"
          alt="יקב מוניץ"
          width={180}
          height={80}
          className="mx-auto mb-3 brightness-0 invert"
          priority
        />
        <p className="text-lg text-white/80">טעימות יין</p>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-stone-800">טעימות פעילות</h2>
          <Link
            href="/admin"
            className="bg-wine text-white px-4 py-2 rounded-lg hover:bg-wine-dark transition-colors text-sm font-medium"
          >
            ניהול
          </Link>
        </div>

        {activeSessions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-stone-200">
            <p className="text-stone-500 text-lg mb-2">אין טעימות פעילות כרגע</p>
            <p className="text-stone-400 text-sm">
              עברו ל
              <Link href="/admin" className="text-wine underline mx-1">
                ניהול
              </Link>
              כדי ליצור טעימה חדשה
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeSessions.map((session) => (
              <Link
                key={session.id}
                href={`/tasting/${session.id}`}
                className="block bg-white rounded-xl shadow-sm border border-stone-200 p-6 hover:shadow-md hover:border-wine/30 transition-all"
              >
                <h3 className="text-xl font-semibold text-stone-800 mb-2">
                  {session.name}
                </h3>
                <p className="text-stone-500 text-sm mb-3">
                  {new Date(session.date).toLocaleDateString("he-IL")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {session.wines.map((sw) => (
                    <span
                      key={sw.id}
                      className="inline-block bg-wine/10 text-wine text-xs px-3 py-1 rounded-full"
                    >
                      {sw.wine.name}
                      {sw.wine.year ? ` ${sw.wine.year}` : ""}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
