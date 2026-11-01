export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_MAX_LENGTH = 100

export const PASSWORD_RULES_TEXT = `לפחות ${PASSWORD_MIN_LENGTH} תווים, באנגלית בלבד, עם אות גדולה, אות קטנה וספרה`

// Returns a Hebrew message for the first rule the password breaks, or null when it is acceptable.
export function checkPassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `הסיסמה חייבת להכיל לפחות ${PASSWORD_MIN_LENGTH} תווים`
  if (password.length > PASSWORD_MAX_LENGTH) return `הסיסמה ארוכה מדי (עד ${PASSWORD_MAX_LENGTH} תווים)`
  if (!/^[\x21-\x7E]+$/.test(password)) return "הסיסמה יכולה להכיל רק אותיות באנגלית, ספרות וסימנים, בלי רווחים ובלי עברית"
  if (!/[A-Z]/.test(password)) return "הסיסמה חייבת להכיל אות גדולה באנגלית"
  if (!/[a-z]/.test(password)) return "הסיסמה חייבת להכיל אות קטנה באנגלית"
  if (!/[0-9]/.test(password)) return "הסיסמה חייבת להכיל לפחות ספרה אחת"
  return null
}

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/

export const USERNAME_RULES_TEXT = "3 עד 32 תווים באנגלית: אותיות, ספרות, נקודה, מקף וקו תחתון"

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase()
}

export function checkUsername(normalized: string): string | null {
  return USERNAME_PATTERN.test(normalized) ? null : `שם המשתמש לא תקין. ${USERNAME_RULES_TEXT}`
}
