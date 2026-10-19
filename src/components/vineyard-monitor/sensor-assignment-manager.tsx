"use client"

import { useState } from "react"
import { assignVineyardSensor } from "@/server/actions/vineyard-monitor-actions"
import type { SensorTileData } from "@/components/vineyard-monitor/vineyard-sensor-grid"

export type AssignableSensor = SensorTileData & { blockId: string | null }
export type BlockOption = { id: string; name: string }

function AssignmentRow({
  sensor,
  blocks,
  onSaved,
}: {
  sensor: AssignableSensor
  blocks: BlockOption[]
  onSaved: () => void
}) {
  const [label, setLabel] = useState(sensor.label)
  const [blockId, setBlockId] = useState(sensor.blockId ?? "")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    const result = await assignVineyardSensor({
      sensorKey: sensor.key,
      blockId: blockId || null,
      label: label.trim() || null,
    })
    setSaving(false)
    if (result.success) {
      setMessage({ type: "success", text: "נשמר" })
      onSaved()
    } else {
      setMessage({ type: "error", text: result.error.message })
    }
  }

  const inputClass =
    "w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end py-3 border-b border-stone-100 last:border-0">
      <div>
        <label className="block text-xs text-stone-500 mb-1">
          שם החיישן (<bdi>{sensor.key}</bdi>)
        </label>
        <input
          className={inputClass}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs text-stone-500 mb-1">כרם</label>
        <select className={inputClass} value={blockId} onChange={(e) => setBlockId(e.target.value)}>
          <option value="">לא משויך</option>
          {blocks.map((block) => (
            <option key={block.id} value={block.id}>
              {block.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-wine text-white px-5 py-2 rounded-lg text-sm hover:bg-wine-dark transition-colors disabled:opacity-50"
        >
          {saving ? "שומר..." : "שמור"}
        </button>
        {message && (
          <span
            className={`text-xs ${message.type === "success" ? "text-green-700" : "text-red-600"}`}
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  )
}

export function SensorAssignmentManager({
  sensors,
  blocks,
  onSaved,
}: {
  sensors: AssignableSensor[]
  blocks: BlockOption[]
  onSaved: () => void
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
      <p className="text-sm text-stone-500 mb-2">
        אפשר לתת לכל חיישן שם משלו ולשייך אותו לכרם. חיישן ששויך יוצג גם בעמוד של הכרם.
      </p>
      {sensors.map((sensor) => (
        <AssignmentRow key={sensor.key} sensor={sensor} blocks={blocks} onSaved={onSaved} />
      ))}
    </div>
  )
}
