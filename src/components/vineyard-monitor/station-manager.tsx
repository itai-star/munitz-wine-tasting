"use client"

import { useState } from "react"
import {
  createVineyardStation,
  deleteVineyardStation,
  updateVineyardStation,
} from "@/server/actions/vineyard-monitor-actions"
import type { StationOverview } from "@/server/actions/vineyard-monitor-data-actions"

export type BlockOption = { id: string; name: string }

const inputClass =
  "w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
const labelClass = "block text-xs text-stone-500 mb-1"

function BlockSelect({
  value,
  onChange,
  blocks,
}: {
  value: string
  onChange: (value: string) => void
  blocks: BlockOption[]
}) {
  return (
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">לא משויכת לכרם</option>
      {blocks.map((block) => (
        <option key={block.id} value={block.id}>
          כרם {block.name}
        </option>
      ))}
    </select>
  )
}

function AddStationForm({ blocks, onChanged }: { blocks: BlockOption[]; onChanged: () => void }) {
  const [name, setName] = useState("")
  const [mac, setMac] = useState("")
  const [blockId, setBlockId] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleAdd() {
    setSaving(true)
    setError("")
    const result = await createVineyardStation({ name, mac, blockId: blockId || null })
    setSaving(false)
    if (result.success) {
      setName("")
      setMac("")
      setBlockId("")
      onChanged()
    } else {
      setError(result.error.message)
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 border border-dashed border-stone-300 rounded-lg p-4">
      <p className="sm:col-span-2 text-sm font-medium text-stone-700">הוספת תחנה</p>
      <div>
        <label className={labelClass}>שם התחנה</label>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>כתובת MAC</label>
        <input
          className={inputClass}
          dir="ltr"
          placeholder="AA:BB:CC:DD:EE:FF"
          value={mac}
          onChange={(e) => setMac(e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>כרם</label>
        <BlockSelect value={blockId} onChange={setBlockId} blocks={blocks} />
      </div>
      {error && <p className="sm:col-span-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded">{error}</p>}
      <div className="sm:col-span-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving}
          className="bg-wine text-white px-6 py-2 rounded-lg text-sm hover:bg-wine-dark transition-colors disabled:opacity-50"
        >
          {saving ? "בודק מול Ecowitt..." : "הוסף תחנה"}
        </button>
      </div>
    </div>
  )
}

function StationRow({
  station,
  blocks,
  onChanged,
}: {
  station: StationOverview
  blocks: BlockOption[]
  onChanged: () => void
}) {
  const [name, setName] = useState(station.name)
  const [blockId, setBlockId] = useState(station.blockId ?? "")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleSave() {
    setBusy(true)
    setMessage(null)
    const result = await updateVineyardStation({ id: station.id, name, blockId: blockId || null })
    setBusy(false)
    if (result.success) {
      setMessage({ type: "success", text: "נשמר" })
      onChanged()
    } else {
      setMessage({ type: "error", text: result.error.message })
    }
  }

  async function handleDelete() {
    if (!confirm(`למחוק את התחנה "${station.name}" ואת כל ההיסטוריה שנאספה ממנה?`)) return
    setBusy(true)
    const result = await deleteVineyardStation(station.id)
    setBusy(false)
    if (result.success) onChanged()
    else setMessage({ type: "error", text: result.error.message })
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end py-3 border-b border-stone-100 last:border-0">
      <div>
        <label className={labelClass}>
          שם התחנה (<bdi>{station.mac}</bdi>)
        </label>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>כרם</label>
        <BlockSelect value={blockId} onChange={setBlockId} blocks={blocks} />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="bg-wine text-white px-5 py-2 rounded-lg text-sm hover:bg-wine-dark transition-colors disabled:opacity-50"
        >
          שמור
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="text-sm text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          מחק
        </button>
        {message && (
          <span className={`text-xs ${message.type === "success" ? "text-green-700" : "text-red-600"}`}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  )
}

export function StationManager({
  stations,
  blocks,
  onChanged,
}: {
  stations: StationOverview[]
  blocks: BlockOption[]
  onChanged: () => void
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 space-y-4">
      <p className="text-sm text-stone-500">
        כל תחנה היא שער אחד עם כתובת MAC משלו. אפשר לשייך כל תחנה לכרם מתוך רשימת הכרמים, והחיישנים
        שלה יוצגו גם בעמוד הכרם.
      </p>
      <div>
        {stations.map((station) => (
          <StationRow key={station.id} station={station} blocks={blocks} onChanged={onChanged} />
        ))}
      </div>
      <AddStationForm blocks={blocks} onChanged={onChanged} />
    </div>
  )
}
