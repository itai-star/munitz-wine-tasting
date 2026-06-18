"use client"

import { useState } from "react"
import Image from "next/image"
import { submitRating, submitImpression, getSessionSummary } from "@/server/actions/tasting-actions"
import { TastingSummary } from "@/components/tasting/tasting-summary"

type Wine = {
  sessionWineId: string
  name: string
  year: number | null
  type: string | null
  description: string | null
  imageUrl: string | null
}

type WineRating = {
  score: number
  notes: string
}

type Summary = {
  sessionName: string
  sessionDate: string
  participantName: string
  wines: {
    wineName: string
    wineYear: number | null
    wineType: string | null
    myScore: number | null
    myNotes: string | null
    avgScore: number
    totalRatings: number
  }[]
  impression: string | null
}

type Step = "name" | "tasting" | "impression" | "summary"

export function TastingFlow({
  sessionId,
  sessionName,
  wines,
}: {
  sessionId: string
  sessionName: string
  wines: Wine[]
}) {
  const [step, setStep] = useState<Step>("name")
  const [participantName, setParticipantName] = useState("")
  const [currentWineIndex, setCurrentWineIndex] = useState(0)
  const [ratings, setRatings] = useState<Record<string, WineRating>>({})
  const [impression, setImpression] = useState("")
  const [summary, setSummary] = useState<Summary | null>(null as Summary | null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const currentWine = wines[currentWineIndex]
  const currentRating = currentWine ? ratings[currentWine.sessionWineId] : undefined

  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (participantName.trim()) {
      setStep("tasting")
    }
  }

  function handleScoreSelect(score: number) {
    if (!currentWine) return
    setRatings((prev) => ({
      ...prev,
      [currentWine.sessionWineId]: {
        ...prev[currentWine.sessionWineId],
        score,
        notes: prev[currentWine.sessionWineId]?.notes ?? "",
      },
    }))
  }

  function handleNotesChange(notes: string) {
    if (!currentWine) return
    setRatings((prev) => ({
      ...prev,
      [currentWine.sessionWineId]: {
        ...prev[currentWine.sessionWineId],
        score: prev[currentWine.sessionWineId]?.score ?? 0,
        notes,
      },
    }))
  }

  function handleGoBack() {
    if (step === "impression") {
      setStep("tasting")
      setCurrentWineIndex(wines.length - 1)
      return
    }
    if (currentWineIndex > 0) {
      setCurrentWineIndex((prev) => prev - 1)
      setError("")
    }
  }

  async function handleSaveAndNext() {
    if (!currentWine || !currentRating?.score) {
      setError("יש לבחור דירוג")
      return
    }
    setLoading(true)
    setError("")

    const result = await submitRating({
      sessionWineId: currentWine.sessionWineId,
      sessionId,
      participantName,
      score: currentRating.score,
      notes: currentRating.notes || null,
    })

    if (!result.success) {
      setError(result.error.message)
      setLoading(false)
      return
    }

    if (currentWineIndex < wines.length - 1) {
      setCurrentWineIndex((prev) => prev + 1)
    } else {
      setStep("impression")
    }
    setLoading(false)
  }

  async function handleImpressionSubmit() {
    setLoading(true)
    setError("")

    if (impression.trim()) {
      const result = await submitImpression({
        sessionId,
        participantName,
        text: impression,
      })
      if (!result.success) {
        setError(result.error.message)
        setLoading(false)
        return
      }
    }

    const summaryResult = await getSessionSummary(sessionId, participantName)
    if (summaryResult.success) {
      setSummary(summaryResult.data)
      setStep("summary")
    } else {
      setError(summaryResult.error.message)
    }
    setLoading(false)
  }

  if (step === "name") {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Image
              src="/logo.png"
              alt="יקב מוניץ"
              width={150}
              height={66}
              className="mx-auto mb-4"
              priority
            />
            <h1 className="text-2xl font-bold text-stone-800 mb-2">
              {sessionName}
            </h1>
            <p className="text-stone-500">{wines.length} יינות לטעימה</p>
          </div>
          <form
            onSubmit={handleNameSubmit}
            className="bg-white rounded-xl shadow-sm border border-stone-200 p-6"
          >
            <label className="block text-sm font-medium text-stone-700 mb-2">
              מה השם שלך?
            </label>
            <input
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              required
              autoFocus
              className="w-full border border-stone-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none mb-4"
              placeholder="הכנס את שמך"
            />
            <button
              type="submit"
              className="w-full bg-wine text-white py-3 rounded-lg hover:bg-wine-dark transition-colors font-medium text-lg"
            >
              בואו נתחיל!
            </button>
          </form>
        </div>
      </main>
    )
  }

  if (step === "tasting" && currentWine) {
    return (
      <main className="flex-1 flex flex-col">
        <header className="bg-wine text-white py-3 px-4">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="יקב מוניץ"
                width={70}
                height={31}
                className="brightness-0 invert"
              />
              <span className="text-sm text-white/70">{participantName}</span>
            </div>
            <span className="text-sm text-white/70">
              יין {currentWineIndex + 1} מתוך {wines.length}
            </span>
          </div>
        </header>

        <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
          <div className="flex gap-1 mb-6">
            {wines.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (i < currentWineIndex) setCurrentWineIndex(i)
                }}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < currentWineIndex
                    ? "bg-wine cursor-pointer hover:bg-wine-light"
                    : i === currentWineIndex
                    ? "bg-wine/60"
                    : "bg-stone-200"
                }`}
              />
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
            <div className="text-center mb-6">
              {currentWine.imageUrl && (
                <div className="mb-4">
                  <Image
                    src={currentWine.imageUrl}
                    alt={currentWine.name}
                    width={120}
                    height={160}
                    className="mx-auto h-40 w-auto object-contain rounded-lg"
                  />
                </div>
              )}
              <h2 className="text-2xl font-bold text-stone-800 mb-1">
                {currentWine.name}
              </h2>
              <div className="flex items-center justify-center gap-2 text-stone-500 text-sm">
                {currentWine.year && <span>{currentWine.year}</span>}
                {currentWine.type && (
                  <span className="bg-wine/10 text-wine px-2 py-0.5 rounded text-xs">
                    {currentWine.type}
                  </span>
                )}
              </div>
              {currentWine.description && (
                <p className="text-stone-400 text-sm mt-2">
                  {currentWine.description}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-stone-700 mb-3 text-center">
                דירוג
              </label>
              <div className="flex justify-center gap-2 flex-wrap">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => handleScoreSelect(score)}
                    className={`w-11 h-11 rounded-full text-sm font-bold transition-all ${
                      currentRating?.score === score
                        ? "bg-wine text-white shadow-lg scale-110"
                        : "bg-stone-100 text-stone-600 hover:bg-wine/20 hover:text-wine"
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
              {currentRating?.score && (
                <p className="text-center text-sm text-stone-500 mt-2">
                  {currentRating.score <= 3
                    ? "לא אהבתי"
                    : currentRating.score <= 5
                    ? "בסדר"
                    : currentRating.score <= 7
                    ? "טוב"
                    : currentRating.score <= 9
                    ? "מצוין!"
                    : "מושלם! 🌟"}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-stone-700 mb-2">
                הערות (אופציונלי)
              </label>
              <textarea
                value={currentRating?.notes ?? ""}
                onChange={(e) => handleNotesChange(e.target.value)}
                rows={3}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none resize-none"
                placeholder="ארומה, טעם, מרקם, צבע..."
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm mb-3 bg-red-50 px-3 py-2 rounded">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              {currentWineIndex > 0 && (
                <button
                  onClick={handleGoBack}
                  type="button"
                  className="px-4 py-3 border border-stone-300 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors font-medium"
                >
                  → חזרה
                </button>
              )}
              <button
                onClick={handleSaveAndNext}
                disabled={loading || !currentRating?.score}
                className="flex-1 bg-wine text-white py-3 rounded-lg hover:bg-wine-dark transition-colors font-medium disabled:opacity-50"
              >
                {loading
                  ? "שומר..."
                  : currentWineIndex < wines.length - 1
                  ? "שמור והמשך ליין הבא ←"
                  : "שמור וסיים"}
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (step === "impression") {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">✨</div>
              <h2 className="text-xl font-bold text-stone-800">
                התרשמות כללית
              </h2>
              <p className="text-stone-500 text-sm mt-1">
                סיימתם לטעום את כל היינות! רגע לפני הסיכום...
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-stone-700 mb-2">
                מה חשבתם על הטעימה?
              </label>
              <textarea
                value={impression}
                onChange={(e) => setImpression(e.target.value)}
                rows={4}
                autoFocus
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none resize-none"
                placeholder="שתפו את ההתרשמות הכללית שלכם מהטעימה..."
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm mb-3 bg-red-50 px-3 py-2 rounded">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleGoBack}
                type="button"
                className="px-4 py-3 border border-stone-300 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors font-medium"
              >
                → חזרה ליינות
              </button>
              <button
                onClick={handleImpressionSubmit}
                disabled={loading}
                className="flex-1 bg-wine text-white py-3 rounded-lg hover:bg-wine-dark transition-colors font-medium disabled:opacity-50"
              >
                {loading ? "מייצר סיכום..." : "צור סיכום 📋"}
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (step === "summary" && summary) {
    return <TastingSummary summary={summary} />
  }

  return null
}
