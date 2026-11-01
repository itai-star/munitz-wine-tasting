import { randomBytes, scrypt, timingSafeEqual } from "crypto"

const SCRYPT_KEY_LENGTH = 64

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, SCRYPT_KEY_LENGTH, (error, key) => (error ? reject(error) : resolve(key)))
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scryptAsync(password, salt)
  return `${salt.toString("base64")}:${key.toString("base64")}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltPart, keyPart] = stored.split(":")
  if (!saltPart || !keyPart) return false
  const expected = Buffer.from(keyPart, "base64")
  const actual = await scryptAsync(password, Buffer.from(saltPart, "base64"))
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

// Verifying against this when the user does not exist keeps the response time the same either way.
let decoyHash: Promise<string> | null = null

export async function verifyAgainstDecoy(password: string): Promise<void> {
  decoyHash ??= hashPassword(randomBytes(12).toString("base64"))
  await verifyPassword(password, await decoyHash)
}
