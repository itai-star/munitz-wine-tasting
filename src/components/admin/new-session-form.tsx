"use client"

import { useState } from "react"
import { createSession } from "@/server/actions/session-actions"
import { useRouter } from "next/navigation"

type Wine = {
  id: string
  name: string
  year: number | null
  type: string | null
}

export function NewSessionForm({ wines }: { wines: Wine[] }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [selectedWines, setSelectedWines] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function toggleWine(wineId: string) {
    setSelectedWines((prev) =>
      prev.includes(wineId)
        ? prev.filter((id) => id !== wineId)
        : [...prev, wineId]
    )
  }

  function moveWine(index: number, direction: "up" | "down") {
    const newOrder = [...selectedWines]
    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newOrder.length) return
    ;[newOrder[index], newOrder[swapIndex]] = [
      newOrder[swapIndex],
      newOrder[index],
    ]
    setSelectedWines(newOrder)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedWines.length === 0) {
      setError("יש לבחור לפחות יין אחד")
      return
    }
    setLoading(true)
    setError("")

    const result = await createSession({ name, wineIds: selectedWines })

    if (result.success) {
      router.push("/admin")
    } else {
      setError(result.error.message)
      setLoading(false)
    }
  }

  const selectedWineObjects = selectedWines
    .map((id) => wines.find((w) => w.id === id))
    .filter(Boolean) as Wine[]

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm border border-stone-200 p-6"
    >
      {error && (
        <p className="text-red-600 text-sm mb-4 bg-red-50 px-3 py-2 rounded">
          {error}
        </p>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-stone-700 mb-1">
          שם הטעימה *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
          placeholder='לדוגמה: טעימה חורפית 2024'
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-stone-700 mb-3">
          בחר יינות לטעימה *
        </label>
        <div className="grid gap-2 max-h-64 overflow-y-auto border border-stone-200 rounded-lg p-3">
          {wines.map((wine) => {
            const isSelected = selectedWines.includes(wine.id)
            return (
              <label
                key={wine.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-wine/10 border border-wine/30"
                    : "bg-stone-50 border border-transparent hover:bg-stone-100"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleWine(wine.id)}
                  className="accent-wine w-4 h-4"
                />
                <span className="flex-1">
                  <span className="font-medium text-stone-800">
                    {wine.name}
                  </span>
                  {wine.year && (
                    <span className="text-stone-500 mr-2">{wine.year}</span>
                  )}
                  {wine.type && (
                    <span className="text-xs bg-stone-200 text-stone-600 px-2 py-0.5 rounded mr-2">
                      {wine.type}
                    </span>
                  )}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      {selectedWineObjects.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-stone-700 mb-3">
            סדר היינות בטעימה
          </label>
          <div className="space-y-2">
            {selectedWineObjects.map((wine, index) => (
              <div
                key={wine.id}
                className="flex items-center gap-3 bg-stone-50 rounded-lg p-3"
              >
                <span className="text-stone-400 text-sm font-mono w-6 text-center">
                  {index + 1}
                </span>
                <span className="flex-1 font-medium text-stone-700">
                  {wine.name}
                  {wine.year ? ` ${wine.year}` : ""}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveWine(index, "up")}
                    disabled={index === 0}
                    className="text-stone-400 hover:text-stone-600 disabled:opacity-30 px-2 py-1"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveWine(index, "down")}
                    disabled={index === selectedWineObjects.length - 1}
                    className="text-stone-400 hover:text-stone-600 disabled:opacity-30 px-2 py-1"
                  >
                    ▼
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || selectedWines.length === 0}
        className="bg-wine text-white px-8 py-2.5 rounded-lg hover:bg-wine-dark transition-colors font-medium disabled:opacity-50"
      >
        {loading ? "יוצר טעימה..." : "צור טעימה"}
      </button>
    </form>
  )
}
