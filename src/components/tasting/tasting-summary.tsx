"use client"

import { useState } from "react"
import Image from "next/image"

type WineSummary = {
  wineName: string
  wineYear: number | null
  wineType: string | null
  myScore: number | null
  myNotes: string | null
  avgScore: number
  totalRatings: number
}

type Summary = {
  sessionName: string
  sessionDate: string
  participantName: string
  wines: WineSummary[]
  impression: string | null
}

function getScoreColor(score: number): string {
  if (score >= 8) return "text-green-600"
  if (score >= 6) return "text-yellow-600"
  if (score >= 4) return "text-orange-600"
  return "text-red-600"
}

function getScoreEmoji(score: number): string {
  if (score >= 9) return "🌟"
  if (score >= 7) return "👍"
  if (score >= 5) return "🤔"
  return "👎"
}

function buildSummaryText(summary: Summary): string {
  const date = new Date(summary.sessionDate).toLocaleDateString("he-IL")
  const lines: string[] = [
    `🍷 סיכום טעימה - ${summary.sessionName}`,
    `📅 ${date} | ${summary.participantName}`,
    "",
  ]

  for (const wine of summary.wines) {
    const year = wine.wineYear ? ` ${wine.wineYear}` : ""
    const score = wine.myScore ? `${wine.myScore}/10` : "-"
    lines.push(`${wine.wineName}${year}: ${score}`)
    if (wine.myNotes) lines.push(`   "${wine.myNotes}"`)
  }

  if (summary.impression) {
    lines.push("", `💭 ${summary.impression}`)
  }

  lines.push("", "יקב מוניץ 🍇 munitz-winery.co.il")

  return lines.join("\n")
}

export function TastingSummary({ summary }: { summary: Summary }) {
  const [copied, setCopied] = useState(false)

  const avgMyScore =
    summary.wines.filter((w) => w.myScore).length > 0
      ? summary.wines.reduce((sum, w) => sum + (w.myScore ?? 0), 0) /
        summary.wines.filter((w) => w.myScore).length
      : 0

  const topWine = [...summary.wines].sort(
    (a, b) => (b.myScore ?? 0) - (a.myScore ?? 0)
  )[0]

  const summaryText = buildSummaryText(summary)

  async function handleCopy() {
    await navigator.clipboard.writeText(summaryText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(summaryText)}`
    window.open(url, "_blank")
  }

  return (
    <main className="flex-1 bg-stone-50">
      <header className="bg-wine text-white py-8 text-center">
        <Image
          src="/logo.png"
          alt="יקב מוניץ"
          width={140}
          height={62}
          className="mx-auto mb-3 brightness-0 invert"
        />
        <h1 className="text-2xl font-bold mb-1">סיכום הטעימה</h1>
        <p className="text-white/70">{summary.sessionName}</p>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-stone-500">טועם/ת</p>
              <p className="font-semibold text-stone-800">
                {summary.participantName}
              </p>
            </div>
            <div className="text-left">
              <p className="text-sm text-stone-500">תאריך</p>
              <p className="font-semibold text-stone-800">
                {new Date(summary.sessionDate).toLocaleDateString("he-IL")}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center pt-4 border-t border-stone-100">
            <div>
              <p className="text-2xl font-bold text-wine">
                {summary.wines.length}
              </p>
              <p className="text-xs text-stone-500">יינות</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${getScoreColor(avgMyScore)}`}>
                {avgMyScore.toFixed(1)}
              </p>
              <p className="text-xs text-stone-500">ממוצע שלי</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-wine">
                {topWine?.myScore ?? "-"}
              </p>
              <p className="text-xs text-stone-500">ציון הגבוה</p>
            </div>
          </div>
        </div>

        {topWine && topWine.myScore && topWine.myScore >= 7 && (
          <div className="bg-gradient-to-l from-wine/5 to-gold/10 rounded-xl border border-wine/20 p-4 text-center">
            <p className="text-sm text-stone-500 mb-1">היין המועדף שלך</p>
            <p className="text-lg font-bold text-wine">
              {topWine.wineName}
              {topWine.wineYear ? ` ${topWine.wineYear}` : ""}
            </p>
            <p className="text-2xl mt-1">{getScoreEmoji(topWine.myScore)}</p>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-stone-800">פירוט יינות</h2>
          {summary.wines.map((wine, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-stone-200 p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-stone-800">
                    {wine.wineName}
                  </h3>
                  <div className="flex gap-2 mt-0.5">
                    {wine.wineYear && (
                      <span className="text-xs text-stone-500">
                        {wine.wineYear}
                      </span>
                    )}
                    {wine.wineType && (
                      <span className="text-xs bg-wine/10 text-wine px-2 py-0.5 rounded">
                        {wine.wineType}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-left">
                  {wine.myScore && (
                    <span
                      className={`text-2xl font-bold ${getScoreColor(wine.myScore)}`}
                    >
                      {wine.myScore}
                    </span>
                  )}
                  <span className="text-stone-300 text-sm">/10</span>
                </div>
              </div>
              {wine.myNotes && (
                <p className="text-sm text-stone-600 bg-stone-50 rounded px-3 py-2 mt-2">
                  {wine.myNotes}
                </p>
              )}
              {wine.totalRatings > 1 && (
                <p className="text-xs text-stone-400 mt-2">
                  ממוצע כללי: {wine.avgScore} ({wine.totalRatings} דירוגים)
                </p>
              )}
            </div>
          ))}
        </div>

        {summary.impression && (
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
            <h2 className="text-lg font-bold text-stone-800 mb-2">
              התרשמות כללית
            </h2>
            <p className="text-stone-600">{summary.impression}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
          <h2 className="text-base font-bold text-stone-800 mb-3 text-center">
            שלח/י את הסיכום לעצמך
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleWhatsApp}
              className="flex-1 bg-[#25D366] text-white py-2.5 rounded-lg hover:bg-[#20BD5A] transition-colors font-medium text-sm"
            >
              WhatsApp
            </button>
            <button
              onClick={handleCopy}
              className="flex-1 border border-stone-300 text-stone-600 py-2.5 rounded-lg hover:bg-stone-50 transition-colors font-medium text-sm"
            >
              {copied ? "הועתק!" : "העתק"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 text-center">
          <h2 className="text-lg font-bold text-stone-800 mb-2">
            הצטרפו לקהילת החברים שלנו
          </h2>
          <p className="text-stone-500 text-sm mb-4">
            הטבות, אירועים ויינות בלעדיים
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent("https://munitz-winery.co.il/members/")}`}
            alt="QR להרשמה לקהילת החברים"
            width={180}
            height={180}
            className="mx-auto mb-3"
          />
          <a
            href="https://munitz-winery.co.il/members/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-wine text-sm font-medium hover:text-wine-dark underline"
          >
            munitz-winery.co.il/members
          </a>
        </div>

        <div className="text-center pt-4 pb-8">
          <p className="text-stone-400 text-sm mb-3">תודה שהשתתפת בטעימה!</p>
          <Image
            src="/logo.png"
            alt="יקב מוניץ"
            width={80}
            height={35}
            className="mx-auto opacity-30"
          />
        </div>
      </div>
    </main>
  )
}
