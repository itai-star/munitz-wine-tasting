export type FinishedWineTypeKey = "RED" | "WHITE" | "ROSE" | "FRESH"

export const FINISHED_WINE_TYPE_KEYS: FinishedWineTypeKey[] = ["WHITE", "ROSE", "RED", "FRESH"]

export function isFinishedWineType(value: string): value is FinishedWineTypeKey {
  return FINISHED_WINE_TYPE_KEYS.some((key) => key === value)
}

export const FINISHED_WINE_TYPE_LABELS: Record<FinishedWineTypeKey, string> = {
  WHITE: "לבן",
  ROSE: "רוזה",
  RED: "אדום",
  FRESH: "רענן",
}

export const FINISHED_WINE_TYPE_COLORS: Record<FinishedWineTypeKey, string> = {
  WHITE: "#a16207",
  ROSE: "#db2777",
  RED: "#722F37",
  FRESH: "#0e7490",
}

export type VolumeRecord = {
  wineType: FinishedWineTypeKey | null
  litersAfterPressing: number | null
  litersAfterFirstRacking: number | null
  litersAfterSecondRacking: number | null
}

export type VolumeStageKey = "afterPressing" | "afterFirstRacking" | "afterSecondRacking"

export const VOLUME_STAGES: { key: VolumeStageKey; label: string; field: keyof Omit<VolumeRecord, "wineType"> }[] = [
  { key: "afterPressing", label: "אחרי פראס", field: "litersAfterPressing" },
  { key: "afterFirstRacking", label: "אחרי שפייה ראשונה", field: "litersAfterFirstRacking" },
  { key: "afterSecondRacking", label: "אחרי שפייה שנייה", field: "litersAfterSecondRacking" },
]

// One kind of wine at one stage. The figure is final once every tank of that kind has been measured at the stage.
export type TypeStageVolume = {
  type: FinishedWineTypeKey | "UNSET"
  liters: number
  measured: number
  tanks: number
  isFinal: boolean
}

export type StageVolumes = {
  key: VolumeStageKey
  label: string
  totalLiters: number
  measured: number
  tanks: number
  isFinal: boolean
  types: TypeStageVolume[]
}

export function summarizeStageVolumes(records: VolumeRecord[]): StageVolumes[] {
  const kinds: (FinishedWineTypeKey | "UNSET")[] = [...FINISHED_WINE_TYPE_KEYS, "UNSET"]

  return VOLUME_STAGES.map(({ key, label, field }) => {
    const types = kinds
      .map((type): TypeStageVolume => {
        const group = records.filter((record) => (record.wineType ?? "UNSET") === type)
        const values = group.map((record) => record[field]).filter((value): value is number => value != null)
        return {
          type,
          liters: values.reduce((sum, value) => sum + value, 0),
          measured: values.length,
          tanks: group.length,
          isFinal: group.length > 0 && values.length === group.length,
        }
      })
      .filter((entry) => entry.tanks > 0)

    const measured = types.reduce((sum, entry) => sum + entry.measured, 0)
    const tanks = types.reduce((sum, entry) => sum + entry.tanks, 0)
    return {
      key,
      label,
      totalLiters: types.reduce((sum, entry) => sum + entry.liters, 0),
      measured,
      tanks,
      isFinal: tanks > 0 && measured === tanks,
      types,
    }
  })
}
