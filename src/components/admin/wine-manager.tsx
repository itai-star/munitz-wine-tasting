"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { createWine, deleteWine } from "@/server/actions/wine-actions"
import { useRouter } from "next/navigation"

type Wine = {
  id: string
  name: string
  year: number | null
  type: string | null
  description: string | null
  imageUrl: string | null
  price: number | null
}

const WINE_TYPES = ["אדום", "לבן", "רוזה", "מבעבע", "קינוח", "אחר"]

export function WineManager({ wines }: { wines: Wine[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")
  const [year, setYear] = useState("")
  const [type, setType] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return null
    const formData = new FormData()
    formData.append("file", imageFile)
    const res = await fetch("/api/upload", { method: "POST", body: formData })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error ?? "שגיאה בהעלאת התמונה")
    }
    const data = await res.json()
    return data.url as string
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const imageUrl = await uploadImage()

      const result = await createWine({
        name,
        year: year ? parseInt(year) : null,
        type: type || null,
        description: description || null,
        imageUrl,
        price: price ? parseInt(price) : null,
      })

      if (result.success) {
        setName("")
        setYear("")
        setType("")
        setDescription("")
        setPrice("")
        clearImage()
        setShowForm(false)
        router.refresh()
      } else {
        setError(result.error.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירה")
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("האם אתה בטוח שברצונך למחוק את היין?")) return
    await deleteWine(id)
    router.refresh()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-stone-500 text-sm">{wines.length} יינות</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-wine text-white px-4 py-2 rounded-lg hover:bg-wine-dark transition-colors text-sm font-medium"
        >
          {showForm ? "ביטול" : "+ יין חדש"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 mb-6"
        >
          <h3 className="font-semibold text-stone-800 mb-4">הוסף יין חדש</h3>
          {error && (
            <p className="text-red-600 text-sm mb-3 bg-red-50 px-3 py-2 rounded">
              {error}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                שם היין *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
                placeholder='לדוגמה: קברנה סוביניון "רזרב"'
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                בציר (שנה)
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                min="1900"
                max="2100"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
                placeholder="2022"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                סוג
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
              >
                <option value="">בחר סוג</option>
                {WINE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                תיאור
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
                placeholder="תיאור קצר של היין"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                מחיר (₪)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
                placeholder="130"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-stone-700 mb-1">
              תמונת היין
            </label>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm px-4 py-2 rounded-lg transition-colors">
                בחר תמונה
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
              {imagePreview && (
                <div className="relative">
                  <Image
                    src={imagePreview}
                    alt="תצוגה מקדימה"
                    width={48}
                    height={48}
                    className="w-12 h-12 object-cover rounded-lg border border-stone-200"
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-stone-400 mt-1">
              JPG, PNG או WebP. עד 5MB.
            </p>
          </div>

          <div className="mt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-wine text-white px-6 py-2 rounded-lg hover:bg-wine-dark transition-colors text-sm font-medium disabled:opacity-50"
            >
              {loading ? "שומר..." : "שמור"}
            </button>
          </div>
        </form>
      )}

      {wines.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-stone-200">
          <p className="text-stone-500 text-lg">אין יינות עדיין</p>
          <p className="text-stone-400 text-sm mt-1">
            הוסף יינות כדי ליצור טעימות
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {wines.map((wine) => (
            <div
              key={wine.id}
              className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {wine.imageUrl ? (
                  <Image
                    src={wine.imageUrl}
                    alt={wine.name}
                    width={48}
                    height={64}
                    className="w-12 h-16 object-cover rounded-lg border border-stone-200"
                  />
                ) : (
                  <div className="w-12 h-16 bg-stone-100 rounded-lg flex items-center justify-center text-stone-300 text-xl">
                    🍷
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-stone-800">
                    {wine.name}
                    {wine.year ? (
                      <span className="text-stone-500 font-normal mr-2">
                        {wine.year}
                      </span>
                    ) : null}
                  </h3>
                  <div className="flex gap-2 mt-1">
                    {wine.type && (
                      <span className="text-xs bg-wine/10 text-wine px-2 py-0.5 rounded">
                        {wine.type}
                      </span>
                    )}
                    {wine.price != null && (
                      <span className="text-xs bg-gold/10 text-stone-700 px-2 py-0.5 rounded font-medium">
                        {wine.price} ₪
                      </span>
                    )}
                    {wine.description && (
                      <span className="text-xs text-stone-400">
                        {wine.description}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(wine.id)}
                className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                מחק
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
