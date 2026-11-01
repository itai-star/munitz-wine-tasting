const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"
const LOWER = "abcdefghijkmnpqrstuvwxyz"
const DIGITS = "23456789"
const LENGTH = 12

function pick(alphabet: string): string {
  const values = new Uint32Array(1)
  // Rejection sampling keeps every character equally likely.
  const limit = Math.floor(0x100000000 / alphabet.length) * alphabet.length
  do crypto.getRandomValues(values)
  while (values[0] >= limit)
  return alphabet[values[0] % alphabet.length]
}

// A temporary password that satisfies the policy, without look-alike characters (0/O, 1/l/I).
export function generatePassword(): string {
  const all = UPPER + LOWER + DIGITS
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS)]
  while (chars.length < LENGTH) chars.push(pick(all))

  for (let i = chars.length - 1; i > 0; i--) {
    const values = new Uint32Array(1)
    const limit = Math.floor(0x100000000 / (i + 1)) * (i + 1)
    do crypto.getRandomValues(values)
    while (values[0] >= limit)
    const j = values[0] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join("")
}
