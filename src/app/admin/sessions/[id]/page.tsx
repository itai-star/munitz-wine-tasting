import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"

export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ id: string }>
}

export default async function SessionResultsPage({ params }: Props) {
  const { id } = await params

  const session = await prisma.tastingSession.findUnique({
    where: { id },
    include: {
      wines: {
        include: { wine: true },
        orderBy: { order: "asc" },
      },
      ratings: true,
      impressions: true,
    },
  })

  if (!session) notFound()

  const participants = Array.from(
    new Set([
      ...session.ratings.map((r) => r.participantName),
      ...session.impressions.map((i) => i.participantName),
    ])
  )

  const wineStats = session.wines.map((sw) => {
    const wineRatings = session.ratings.filter(
      (r) => r.sessionWineId === sw.id
    )
    const avg =
      wineRatings.length > 0
        ? wineRatings.reduce((sum, r) => sum + r.score, 0) /
          wineRatings.length
        : 0
    const highest =
      wineRatings.length > 0
        ? Math.max(...wineRatings.map((r) => r.score))
        : 0
    const lowest =
      wineRatings.length > 0
        ? Math.min(...wineRatings.map((r) => r.score))
        : 0

    return {
      sessionWineId: sw.id,
      wine: sw.wine,
      ratings: wineRatings,
      avg: Math.round(avg * 10) / 10,
      highest,
      lowest,
      count: wineRatings.length,
    }
  })

  const overallAvg =
    session.ratings.length > 0
      ? session.ratings.reduce((sum, r) => sum + r.score, 0) /
        session.ratings.length
      : 0

  const topWine = [...wineStats].sort((a, b) => b.avg - a.avg)[0]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/admin"
            className="text-sm text-wine hover:text-wine-dark mb-1 inline-block"
          >
            ← חזרה לטעימות
          </Link>
          <h1 className="text-2xl font-bold text-stone-800">{session.name}</h1>
          <p className="text-stone-500 text-sm">
            {new Date(session.date).toLocaleDateString("he-IL")} ·{" "}
            {participants.length} משתתפים · {session.wines.length} יינות
          </p>
        </div>
        <span
          className={`text-xs px-3 py-1 rounded-full ${
            session.isActive
              ? "bg-green-100 text-green-700"
              : "bg-stone-100 text-stone-500"
          }`}
        >
          {session.isActive ? "פעילה" : "לא פעילה"}
        </span>
      </div>

      {participants.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-stone-200">
          <p className="text-stone-500 text-lg">אין תוצאות עדיין</p>
          <p className="text-stone-400 text-sm mt-1">
            עדיין אף אחד לא השתתף בטעימה הזו
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="משתתפים" value={participants.length.toString()} />
            <StatCard
              label="ממוצע כללי"
              value={overallAvg.toFixed(1)}
              color={getScoreColor(overallAvg)}
            />
            <StatCard
              label="יין מוביל"
              value={topWine?.wine.name ?? "-"}
              subtitle={topWine ? `${topWine.avg}/10` : undefined}
            />
            <StatCard
              label="דירוגים"
              value={session.ratings.length.toString()}
            />
          </div>

          <section>
            <h2 className="text-lg font-bold text-stone-800 mb-3">
              דירוג לפי יין
            </h2>
            <div className="space-y-3">
              {wineStats.map((ws) => (
                <div
                  key={ws.sessionWineId}
                  className="bg-white rounded-xl shadow-sm border border-stone-200 p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-stone-800">
                        {ws.wine.name}
                        {ws.wine.year && (
                          <span className="text-stone-500 font-normal mr-2">
                            {ws.wine.year}
                          </span>
                        )}
                      </h3>
                      {ws.wine.type && (
                        <span className="text-xs bg-wine/10 text-wine px-2 py-0.5 rounded mt-1 inline-block">
                          {ws.wine.type}
                        </span>
                      )}
                    </div>
                    <div className="text-left">
                      <span
                        className={`text-3xl font-bold ${getScoreColor(ws.avg)}`}
                      >
                        {ws.avg}
                      </span>
                      <span className="text-stone-300 text-sm">/10</span>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {ws.lowest}-{ws.highest} · {ws.count} דירוגים
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <ScoreBar score={ws.avg} />
                  </div>

                  <div className="space-y-2">
                    {ws.ratings.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-start gap-3 bg-stone-50 rounded-lg px-3 py-2"
                      >
                        <span className="text-sm font-medium text-stone-700 shrink-0 w-20">
                          {r.participantName}
                        </span>
                        <span
                          className={`text-sm font-bold shrink-0 ${getScoreColor(r.score)}`}
                        >
                          {r.score}/10
                        </span>
                        {r.notes && (
                          <span className="text-sm text-stone-500">
                            {r.notes}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {session.impressions.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-stone-800 mb-3">
                התרשמויות כלליות
              </h2>
              <div className="space-y-3">
                {session.impressions.map((imp) => (
                  <div
                    key={imp.id}
                    className="bg-white rounded-xl shadow-sm border border-stone-200 p-4"
                  >
                    <p className="text-sm font-medium text-wine mb-1">
                      {imp.participantName}
                    </p>
                    <p className="text-stone-600">{imp.text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-lg font-bold text-stone-800 mb-3">
              טבלת משתתפים
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50">
                    <th className="text-right px-4 py-3 font-medium text-stone-600">
                      שם
                    </th>
                    {wineStats.map((ws) => (
                      <th
                        key={ws.sessionWineId}
                        className="text-center px-3 py-3 font-medium text-stone-600"
                      >
                        {ws.wine.name}
                      </th>
                    ))}
                    <th className="text-center px-3 py-3 font-medium text-stone-600">
                      ממוצע
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((name) => {
                    const participantRatings = session.ratings.filter(
                      (r) => r.participantName === name
                    )
                    const pAvg =
                      participantRatings.length > 0
                        ? participantRatings.reduce(
                            (sum, r) => sum + r.score,
                            0
                          ) / participantRatings.length
                        : 0

                    return (
                      <tr
                        key={name}
                        className="border-b border-stone-100 last:border-0"
                      >
                        <td className="px-4 py-3 font-medium text-stone-800">
                          {name}
                        </td>
                        {wineStats.map((ws) => {
                          const rating = participantRatings.find(
                            (r) => r.sessionWineId === ws.sessionWineId
                          )
                          return (
                            <td
                              key={ws.sessionWineId}
                              className={`text-center px-3 py-3 font-bold ${
                                rating
                                  ? getScoreColor(rating.score)
                                  : "text-stone-300"
                              }`}
                            >
                              {rating ? rating.score : "-"}
                            </td>
                          )
                        })}
                        <td
                          className={`text-center px-3 py-3 font-bold ${getScoreColor(pAvg)}`}
                        >
                          {pAvg > 0 ? pAvg.toFixed(1) : "-"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function getScoreColor(score: number): string {
  if (score >= 8) return "text-green-600"
  if (score >= 6) return "text-yellow-600"
  if (score >= 4) return "text-orange-600"
  return "text-red-600"
}

function StatCard({
  label,
  value,
  subtitle,
  color,
}: {
  label: string
  value: string
  subtitle?: string
  color?: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 text-center">
      <p className="text-xs text-stone-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color ?? "text-stone-800"}`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>
      )}
    </div>
  )
}

function ScoreBar({ score }: { score: number }) {
  const percentage = ((score - 5) / 5) * 100
  return (
    <div className="w-full bg-stone-100 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${
          score >= 8
            ? "bg-green-500"
            : score >= 6
            ? "bg-yellow-500"
            : score >= 4
            ? "bg-orange-500"
            : "bg-red-500"
        }`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
