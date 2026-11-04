import { BARREL_LITERS, EXPECTED_LOSS_PERCENT, TOPPING_LITERS_PER_BARREL } from "@/lib/barrel-plan"
import type { BarrelYearRow } from "@/lib/barrel-room"

// The rules of the calculation, as they are shown on the procurement screen next to the result. Each is a sentence the
// figures follow, so a change to the calculation changes this list with it.
export function barrelPurchaseRules(year: number): string[] {
  const previous = year - 1
  return [
    `הרכש מחושב לפי שנת בציר. כאן נקבע כמה חביות צריך לרכוש לבציר ${year}.`,
    `חביות דרושות הן החביות שכבר מלאות ביין של בציר ${year}, ועוד החביות שעדיין נדרשות ליין האדום שטרם הוכנס לחביות, לפי תכנון החביות. בתכנון, חבית מכילה ${BARREL_LITERS} ליטר, ועוד ${TOPPING_LITERS_PER_BARREL} ליטר ליין שנשאר מחוץ לחבית לצורך מילוי. אחרי הפראס מניחים פחת של ${EXPECTED_LOSS_PERCENT}%. יין רענן אינו נכנס לחביות.`,
    `חביות קיימות הן החביות שהיו בחדר החביות בשנת ${previous} ועדיין נמצאות במלאי. חבית שהוצאה מהמלאי אינה נספרת.`,
    `חבית שסומנה בשנת ${previous} כסבב אחרון אינה נספרת, כי היא עומדת לצאת מהמלאי. ברירת המחדל היא שהסימון כבוי.`,
    `חביות לרכישה הן החביות הדרושות פחות החביות הקיימות, ולא פחות מאפס. אם יש יותר חביות מהדרוש, ההפרש מוצג כעודף.`,
    `הסימון "תכלול בחישוב בקבוקים ופקקים" נקבע לכל חבית בכל שנה, וברירת המחדל היא שהוא דולק. הוא אינו משפיע על חישוב החביות, והוא ישמש בהמשך לחישוב הבקבוקים, הפקקים והארגזים.`,
  ]
}

export type BarrelPurchase = {
  year: number
  previousYear: number
  // Barrels already holding wine of the year.
  filledBarrels: number
  // Barrels the plan still needs for the red wine of the year that is not in barrels yet, and whether the figures it rests on
  // are final or an estimate. Without a vintage of the year there is no plan.
  plannedBarrels: number
  hasPlan: boolean
  isPlanFinal: boolean
  neededBarrels: number
  inRoomBarrels: number
  lastRoundBarrels: number
  availableBarrels: number
  toBuy: number
  surplus: number
}

// Whether a barrel of the previous year can be used for the new vintage: it is still in the stock, and it is not marked as
// being in its last round.
export function isAvailable(row: Pick<BarrelYearRow, "state" | "lastRound">): boolean {
  return row.state === "IN_STOCK" && !row.lastRound
}

export function calculateBarrelPurchase(input: {
  year: number
  previousYearBarrels: BarrelYearRow[]
  filledBarrels: number
  plannedBarrels: number
  hasPlan: boolean
  isPlanFinal: boolean
}): BarrelPurchase {
  const inRoom = input.previousYearBarrels.filter((row) => row.state === "IN_STOCK")
  const availableBarrels = inRoom.filter(isAvailable).length
  const neededBarrels = input.filledBarrels + input.plannedBarrels
  return {
    year: input.year,
    previousYear: input.year - 1,
    filledBarrels: input.filledBarrels,
    plannedBarrels: input.plannedBarrels,
    hasPlan: input.hasPlan,
    isPlanFinal: input.isPlanFinal,
    neededBarrels,
    inRoomBarrels: inRoom.length,
    lastRoundBarrels: inRoom.length - availableBarrels,
    availableBarrels,
    toBuy: Math.max(0, neededBarrels - availableBarrels),
    surplus: Math.max(0, availableBarrels - neededBarrels),
  }
}
