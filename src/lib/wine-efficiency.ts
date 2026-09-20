export type WineEfficiencyStages = {
  harvestedWeightKg: number
  litersAfterPressing: number | null
  litersAfterFirstRacking: number | null
  litersAfterSecondRacking: number | null
}

export type WineEfficiencyResult = {
  afterPressing: number | null
  afterFirstRacking: number | null
  afterSecondRacking: number | null
}

function ratioPercent(numerator: number | null, denominator: number | null): number | null {
  if (numerator == null || denominator == null || denominator === 0) return null
  return (numerator / denominator) * 100
}

export function calculateWineEfficiency(stages: WineEfficiencyStages): WineEfficiencyResult {
  return {
    // Winemaking yield convention: liters extracted per kg of grapes, expressed as a percentage.
    // Every stage is measured against the same harvested weight, not the previous stage.
    afterPressing: ratioPercent(stages.litersAfterPressing, stages.harvestedWeightKg),
    afterFirstRacking: ratioPercent(stages.litersAfterFirstRacking, stages.harvestedWeightKg),
    afterSecondRacking: ratioPercent(stages.litersAfterSecondRacking, stages.harvestedWeightKg),
  }
}

export function averageWineEfficiency(records: WineEfficiencyStages[]): WineEfficiencyResult {
  function average(values: (number | null)[]): number | null {
    const nums = values.filter((v): v is number => v != null)
    if (nums.length === 0) return null
    return nums.reduce((sum, v) => sum + v, 0) / nums.length
  }

  const perRecord = records.map(calculateWineEfficiency)
  return {
    afterPressing: average(perRecord.map((r) => r.afterPressing)),
    afterFirstRacking: average(perRecord.map((r) => r.afterFirstRacking)),
    afterSecondRacking: average(perRecord.map((r) => r.afterSecondRacking)),
  }
}
