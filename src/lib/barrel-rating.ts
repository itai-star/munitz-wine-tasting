// The red wine tasting form of the winery. Each parameter is rated by choosing one of five levels, and each level is worth
// the points the form gives it. The lowest levels add up to 40 and the highest to 100, so a full form scores 40 to 100.
export const RATING_PARAMS = [
  { key: "appearanceQuality", group: "מראה", label: "צבע, איכות", points: [1, 2, 3, 4, 5] },
  { key: "colorIntensity", group: "מראה", label: "צבע, עוצמה", points: [2, 4, 6, 8, 10] },
  { key: "aromaIntensity", group: "ריח", label: "ריכוזיות (עוז)", points: [2, 4, 6, 7, 8] },
  { key: "aromaOriginality", group: "ריח", label: "מקוריות", points: [2, 3, 4, 5, 6] },
  { key: "aromaQuality", group: "ריח", label: "איכות", points: [8, 10, 12, 14, 16] },
  { key: "tasteIntensity", group: "טעם", label: "ריכוזיות", points: [2, 4, 6, 7, 8] },
  { key: "tasteOriginality", group: "טעם", label: "מקוריות", points: [2, 3, 4, 5, 6] },
  { key: "tasteQuality", group: "טעם", label: "איכות", points: [10, 13, 16, 19, 22] },
  { key: "finish", group: "טעם", label: "שיוריות", points: [4, 5, 6, 7, 8] },
  { key: "overall", group: "הערכה כללית", label: "הערכה כללית", points: [7, 8, 9, 10, 11] },
] as const

export type RatingKey = (typeof RATING_PARAMS)[number]["key"]
export type RatingLevels = Record<RatingKey, number>

export const LEVEL_COUNT = 5
export const MAX_TOTAL = 100
export const MAX_PARAM_NOTE = 500
export const MAX_RATING_NOTES = 2000

export const RATING_KEYS: RatingKey[] = RATING_PARAMS.map((param) => param.key)

export function isLevel(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= LEVEL_COUNT
}

export function pointsOf(key: RatingKey, level: number): number {
  const param = RATING_PARAMS.find((candidate) => candidate.key === key)
  return param ? param.points[level - 1] : 0
}

export function maxPointsOf(key: RatingKey): number {
  return pointsOf(key, LEVEL_COUNT)
}

// The points of the levels chosen so far; a parameter not chosen yet adds nothing.
export function totalOf(levels: Partial<Record<RatingKey, number | null>>): number {
  return RATING_KEYS.reduce((sum, key) => {
    const level = levels[key]
    return sum + (isLevel(level) ? pointsOf(key, level) : 0)
  }, 0)
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10
}

export type RatingParamSummary = { key: RatingKey; average: number | null; max: number }
export type RatingSummary = { count: number; params: RatingParamSummary[]; total: number | null }

// The average points of every parameter over the forms of a barrel, and their sum, which is the average score of the barrel.
export function summarizeRatings(ratings: RatingLevels[]): RatingSummary {
  const params = RATING_PARAMS.map((param): RatingParamSummary => {
    const average = ratings.length === 0 ? null : ratings.reduce((sum, rating) => sum + pointsOf(param.key, rating[param.key]), 0) / ratings.length
    return { key: param.key, average: average === null ? null : roundTenth(average), max: maxPointsOf(param.key) }
  })
  const total = ratings.length === 0 ? null : roundTenth(ratings.reduce((sum, rating) => sum + totalOf(rating), 0) / ratings.length)
  return { count: ratings.length, params, total }
}

export type Rater = { userId: string; username: string }

// What one viewer may see of the tasting of a barrel. A taster sees the results only once they rated the barrel themselves, so
// the others do not sway them; an administrator always sees them. Whatever is hidden is not sent to the page at all.
export type BarrelTastingView = {
  visible: boolean
  ratedByMe: boolean
  summary: RatingSummary | null
  raters: Rater[]
  // Tasters of the year who did not rate the barrel yet.
  pending: Rater[]
}
