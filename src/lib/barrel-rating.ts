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

export type Rater = { userId: string; username: string }

// A rating that stands out. With three tasters or more, a rating two levels or more away from the average of the other tasters
// is an outlier; leaving the rating itself out of that average keeps it from hiding itself in a small group. With two tasters
// there is no telling which one stands out, so two ratings two levels or more apart are both marked as a gap.
export const OUTLIER_LEVEL_GAP = 2
export const MIN_TASTERS_FOR_OUTLIERS = 3

export type RatingFlag = { kind: "outlier" | "gap"; rater: Rater; points: number; othersAverage: number }

export type RatingParamSummary = {
  key: RatingKey
  average: number | null
  max: number
  flags: RatingFlag[]
  // The level an administrator chose instead of the average, and the points the parameter finally counts for.
  decidedLevel: number | null
  final: number | null
}

export type RatingSummary = {
  count: number
  params: RatingParamSummary[]
  total: number | null
  // The average with the administrator's choices in place of the averages they replace; null while a parameter has neither.
  finalTotal: number | null
  hasDecision: boolean
}

export type RatedForm = { rater: Rater; levels: RatingLevels }
export type RatingDecision = Partial<Record<RatingKey, number>>

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function flagsOf(key: RatingKey, forms: RatedForm[]): RatingFlag[] {
  if (forms.length < 2) return []
  const flag = (kind: RatingFlag["kind"], form: RatedForm, others: RatedForm[]): RatingFlag => ({
    kind,
    rater: form.rater,
    points: pointsOf(key, form.levels[key]),
    othersAverage: roundTenth(mean(others.map((other) => pointsOf(key, other.levels[key])))),
  })
  if (forms.length < MIN_TASTERS_FOR_OUTLIERS) {
    const [first, second] = forms
    if (Math.abs(first.levels[key] - second.levels[key]) < OUTLIER_LEVEL_GAP) return []
    return [flag("gap", first, [second]), flag("gap", second, [first])]
  }
  return forms.flatMap((form) => {
    const others = forms.filter((other) => other !== form)
    return Math.abs(form.levels[key] - mean(others.map((other) => other.levels[key]))) >= OUTLIER_LEVEL_GAP ? [flag("outlier", form, others)] : []
  })
}

// The average points of every parameter over the forms of a barrel and their sum, which is the average score of the barrel, the
// ratings that stand out, and the final score once an administrator's choices replace some of the averages.
export function summarizeRatings(forms: RatedForm[], decision: RatingDecision = {}): RatingSummary {
  // The final score is summed from the exact averages, so a barrel without decisions scores exactly its average.
  let finalSum: number | null = 0
  const params = RATING_PARAMS.map((param): RatingParamSummary => {
    const exact = forms.length === 0 ? null : mean(forms.map((form) => pointsOf(param.key, form.levels[param.key])))
    const decided = decision[param.key]
    const decidedLevel = isLevel(decided) ? decided : null
    const finalExact = decidedLevel !== null ? pointsOf(param.key, decidedLevel) : exact
    finalSum = finalSum === null || finalExact === null ? null : finalSum + finalExact
    return {
      key: param.key,
      average: exact === null ? null : roundTenth(exact),
      max: maxPointsOf(param.key),
      flags: flagsOf(param.key, forms),
      decidedLevel,
      final: finalExact === null ? null : roundTenth(finalExact),
    }
  })
  const total = forms.length === 0 ? null : roundTenth(mean(forms.map((form) => totalOf(form.levels))))
  return { count: forms.length, params, total, finalTotal: finalSum === null ? null : roundTenth(finalSum), hasDecision: params.some((param) => param.decidedLevel !== null) }
}

// A decision is kept as an object; anything in it that is not a level of a known parameter is left out.
export function decisionOf(value: unknown): RatingDecision {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {}
  const decision: RatingDecision = {}
  for (const key of RATING_KEYS) {
    const level = (value as Record<string, unknown>)[key]
    if (isLevel(level)) decision[key] = level
  }
  return decision
}

// The notes one taster wrote on a barrel: the general note of the form and the note of each parameter that has one.
export type RatingNote = { rater: Rater; general: string | null; params: { key: RatingKey; note: string }[] }

// What one viewer may see of the tasting of a barrel. A taster sees the results only once they rated the barrel themselves, so
// the others do not sway them; an administrator always sees them. Whatever is hidden is not sent to the page at all, and the
// notes of the tasters follow the same rule.
export type BarrelTastingView = {
  visible: boolean
  ratedByMe: boolean
  summary: RatingSummary | null
  raters: Rater[]
  notes: RatingNote[]
  // Tasters of the year who did not rate the barrel yet.
  pending: Rater[]
}

// The barrel being tasted now in a year, who of the tasters saved a form for it and who has not yet.
export type ActiveTasting = {
  activeFillId: string | null
  saved: Rater[]
  waiting: Rater[]
}

// Only one barrel is tasted at a time: a new one can be chosen when none is being tasted, or once every taster saved a form for
// the one that is. A barrel chosen by mistake is cancelled first, see canCancel.
export function canMoveOn(active: ActiveTasting): boolean {
  return active.activeFillId === null || active.waiting.length === 0
}

// The barrel being tasted can be cancelled as long as no form at all was saved for it.
export function canCancel(active: ActiveTasting, formsOnActive: number): boolean {
  return active.activeFillId !== null && formsOnActive === 0
}
