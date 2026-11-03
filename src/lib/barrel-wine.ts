// The wine in a barrel in a year: one or more vineyard blocks, each with its share in percent.
export type WinePart = { blockId: string; blockName: string; variety: string; percent: number }

export type ParsedWinePart = { name: string; percent: number }

// The shares of a barrel must add up to 100, give or take what rounding to a decimal leaves.
const PERCENT_TOLERANCE = 0.05

export function formatPercent(percent: number): string {
  return `${Number.isInteger(percent) ? percent : Math.round(percent * 10) / 10}%`
}

// "SHCF (65%) + PKMR (35%)", or just the name of the block when the whole wine comes from one.
export function formatWine(parts: { name: string; percent: number }[]): string {
  if (parts.length === 1) return parts[0].name
  return parts.map((part) => `${part.name} (${formatPercent(part.percent)})`).join(" + ")
}

export function validateShares(percents: number[]): string | null {
  if (percents.length === 0) return null
  if (percents.some((percent) => !Number.isFinite(percent) || percent <= 0 || percent > 100)) return "כל אחוז צריך להיות בין 0 ל-100"
  const total = percents.reduce((sum, percent) => sum + percent, 0)
  if (Math.abs(total - 100) > PERCENT_TOLERANCE) return `האחוזים מסתכמים ב-${Math.round(total * 10) / 10}% ולא ב-100%`
  return null
}

const WITH_PARENTHESES = /^(.+?)\s*\(\s*(\d+(?:[.,]\d+)?)\s*%?\s*\)$/
const WITH_SUFFIX = /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*%$/

// Reads the written form, "SHCF (65%) + PKMR (35%)", where the blocks may also be joined with &. A wine from a single
// block may be written without a share.
export function parseWine(text: string): { parts: ParsedWinePart[] } | { error: string } {
  const terms = text.split(/[+&]/).map((term) => term.trim()).filter((term) => term.length > 0)
  if (terms.length === 0) return { error: "לא נכתב יין" }

  const written = terms.map((term) => {
    const match = WITH_PARENTHESES.exec(term) ?? WITH_SUFFIX.exec(term)
    return match ? { name: match[1].trim(), percent: Number(match[2].replace(",", ".")) } : { name: term, percent: null }
  })

  if (written.length === 1 && written[0].percent === null) return { parts: [{ name: written[0].name, percent: 100 }] }
  if (written.some((part) => part.percent === null)) return { error: "בשילוב של כמה כרמים צריך לכתוב אחוז ליד כל כרם, למשל SHCF (65%) + PKMR (35%)" }

  const parts = written.map((part) => ({ name: part.name, percent: part.percent ?? 0 }))
  if (new Set(parts.map((part) => part.name.toLowerCase())).size !== parts.length) return { error: "אותו כרם מופיע יותר מפעם אחת" }
  const problem = validateShares(parts.map((part) => part.percent))
  return problem ? { error: problem } : { parts }
}
