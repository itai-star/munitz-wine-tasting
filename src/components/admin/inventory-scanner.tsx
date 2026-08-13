"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser"
import { withdrawWine } from "@/server/actions/inventory-actions"
import { WithdrawForm } from "./withdraw-form"

type InventoryWine = {
  id: string
  name: string
  barcode: string | null
  quantity: number
}

type WithdrawalEntry = {
  id: string
  wineName: string
  quantity: number
  createdAt: Date
}

type Mode = "camera" | "manual"

export function InventoryScanner({
  wines,
  recentWithdrawals,
}: {
  wines: InventoryWine[]
  recentWithdrawals: WithdrawalEntry[]
}) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("camera")
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState("")
  const [matchedWine, setMatchedWine] = useState<InventoryWine | null>(null)
  const [manualWineId, setManualWineId] = useState("")
  const [withdrawQuantity, setWithdrawQuantity] = useState("1")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)

  function stopScanning() {
    controlsRef.current?.stop()
    controlsRef.current = null
    setIsScanning(false)
  }

  useEffect(() => {
    return () => {
      controlsRef.current?.stop()
    }
  }, [])

  async function startScanning() {
    setScanError("")
    setMessage(null)
    setMatchedWine(null)
    try {
      const reader = new BrowserMultiFormatReader()
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current ?? undefined,
        (result) => {
          if (result) {
            handleBarcodeDetected(result.getText())
          }
        }
      )
      controlsRef.current = controls
      setIsScanning(true)
    } catch {
      setScanError("לא ניתן לגשת למצלמה. יש לוודא שניתנה הרשאת מצלמה בדפדפן.")
    }
  }

  function handleBarcodeDetected(barcode: string) {
    stopScanning()
    const wine = wines.find((w) => w.barcode === barcode)
    if (!wine) {
      setScanError(`ברקוד לא מזוהה (${barcode}). ניתן לשייך אותו ליין בעריכה תחת "ניהול יינות".`)
      return
    }
    setMatchedWine(wine)
    setWithdrawQuantity("1")
  }

  function switchMode(next: Mode) {
    stopScanning()
    setMode(next)
    setMatchedWine(null)
    setScanError("")
    setMessage(null)
    setManualWineId("")
  }

  async function confirmWithdrawal(wineId: string) {
    const qty = parseInt(withdrawQuantity)
    if (!qty || qty < 1) {
      setMessage({ type: "error", text: "יש להזין כמות תקינה" })
      return
    }
    setSubmitting(true)
    setMessage(null)
    const result = await withdrawWine({ wineId, quantity: qty })
    setSubmitting(false)

    if (result.success) {
      setMessage({
        type: "success",
        text: `נמשכו ${qty} בקבוקים מ"${result.data.wineName}" — נותרו ${result.data.newQuantity} במלאי`,
      })
      setMatchedWine(null)
      setManualWineId("")
      setWithdrawQuantity("1")
      router.refresh()
    } else {
      setMessage({ type: "error", text: result.error.message })
    }
  }

  const manualWine = wines.find((w) => w.id === manualWineId) ?? null

  return (
    <div className="grid gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => switchMode("camera")}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === "camera" ? "bg-wine text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            סריקת מצלמה
          </button>
          <button
            onClick={() => switchMode("manual")}
            className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === "manual" ? "bg-wine text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            בחירה ידנית
          </button>
        </div>

        {message && (
          <p
            className={`text-sm mb-4 px-3 py-2 rounded ${
              message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
            }`}
          >
            {message.text}
          </p>
        )}

        {mode === "camera" ? (
          <div>
            <video
              ref={videoRef}
              className={`w-full max-w-sm mx-auto rounded-lg bg-stone-900 ${isScanning ? "block" : "hidden"}`}
              muted
              playsInline
            />
            {scanError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded mb-3">{scanError}</p>
            )}
            {!isScanning && !matchedWine && (
              <button
                onClick={startScanning}
                className="bg-wine text-white px-6 py-2 rounded-lg hover:bg-wine-dark transition-colors text-sm font-medium"
              >
                התחל סריקה
              </button>
            )}
            {isScanning && (
              <button
                onClick={stopScanning}
                className="mt-3 text-sm px-4 py-2 border border-stone-300 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors"
              >
                עצור סריקה
              </button>
            )}
            {matchedWine && (
              <div className="mt-4 border border-stone-200 rounded-lg p-4">
                <h3 className="font-medium text-stone-800 mb-1">{matchedWine.name}</h3>
                <p className="text-sm text-stone-500 mb-3">{matchedWine.quantity} בקבוקים במלאי כרגע</p>
                <WithdrawForm
                  quantity={withdrawQuantity}
                  onQuantityChange={setWithdrawQuantity}
                  onConfirm={() => confirmWithdrawal(matchedWine.id)}
                  onCancel={() => setMatchedWine(null)}
                  submitting={submitting}
                />
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">בחר יין</label>
            <select
              value={manualWineId}
              onChange={(e) => setManualWineId(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none mb-4"
            >
              <option value="">בחר יין</option>
              {wines.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} — {w.quantity} במלאי
                </option>
              ))}
            </select>
            {manualWine && (
              <WithdrawForm
                quantity={withdrawQuantity}
                onQuantityChange={setWithdrawQuantity}
                onConfirm={() => confirmWithdrawal(manualWine.id)}
                submitting={submitting}
              />
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
        <h3 className="font-semibold text-stone-800 mb-4">משיכות אחרונות</h3>
        {recentWithdrawals.length === 0 ? (
          <p className="text-stone-400 text-sm">עדיין לא נרשמו משיכות</p>
        ) : (
          <div className="grid gap-2">
            {recentWithdrawals.map((w) => (
              <div key={w.id} className="flex justify-between items-center text-sm py-2 border-b border-stone-100 last:border-0">
                <span className="text-stone-700">{w.wineName}</span>
                <span className="text-stone-500">
                  {w.quantity} בקבוקים · {new Date(w.createdAt).toLocaleString("he-IL")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
