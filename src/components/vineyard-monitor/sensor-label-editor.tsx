"use client"

import { useState } from "react"
import { saveVineyardSensorLabel } from "@/server/actions/vineyard-monitor-actions"
import { defaultSensorLabel, type SensorTile } from "@/lib/ecowitt"

function LabelRow({ sensor, onSaved }: { sensor: SensorTile; onSaved: () => void }) {
  const [label, setLabel] = useState(sensor.label)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    const trimmed = label.trim()
    const isDefault = trimmed === defaultSensorLabel(sensor.key, sensor.kind)
    const result = await saveVineyardSensorLabel({
      stationId: sensor.stationId,
      sensorKey: sensor.key,
      label: isDefault ? "" : trimmed,
    })
    setSaving(false)
    if (result.success) {
      setMessage({ type: "success", text: "נשמר" })
      onSaved()
    } else {
      setMessage({ type: "error", text: result.error.message })
    }
  }

  return (
    <div className="flex items-center gap-2 py-1.5">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        aria-label={`שם החיישן ${sensor.key}`}
        className="flex-1 border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="text-sm border border-stone-300 text-stone-700 px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
      >
        {saving ? "שומר..." : "שמור"}
      </button>
      {message && (
        <span className={`text-xs ${message.type === "success" ? "text-green-700" : "text-red-600"}`}>
          {message.text}
        </span>
      )}
    </div>
  )
}

export function SensorLabelEditor({
  sensors,
  onSaved,
}: {
  sensors: SensorTile[]
  onSaved: () => void
}) {
  if (sensors.length === 0) return null

  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-sm text-wine">שמות החיישנים בתחנה</summary>
      <div className="mt-2">
        {sensors.map((sensor) => (
          <LabelRow key={sensor.key} sensor={sensor} onSaved={onSaved} />
        ))}
      </div>
    </details>
  )
}
