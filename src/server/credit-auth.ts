import { createHmac, randomBytes, scrypt, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

const ACCESS_ID = "default"
const SESSION_COOKIE = "credit_session"
const SESSION_HOURS = 8
const MAX_FAILED_ATTEMPTS = 5
const LOCK_MINUTES = 15
const SCRYPT_KEY_LENGTH = 64
const MIN_PASSWORD_LENGTH = 10

export const CREDIT_PASSWORD_MIN_LENGTH = MIN_PASSWORD_LENGTH

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

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltPart, keyPart] = stored.split(":")
  if (!saltPart || !keyPart) return false
  const expected = Buffer.from(keyPart, "base64")
  const actual = await scryptAsync(password, Buffer.from(saltPart, "base64"))
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

// The signing key is bound to the stored password hash, so changing the password
// (or resetting it in the database) invalidates every open session.
function sessionSignature(expiresAt: number, passwordHash: string): string {
  const secret = process.env.REMOTE_MONITOR_ENCRYPTION_KEY
  if (!secret) throw new Error("REMOTE_MONITOR_ENCRYPTION_KEY is not set")
  const key = createHmac("sha256", secret).update(`credit-session:${passwordHash}`).digest()
  return createHmac("sha256", key).update(String(expiresAt)).digest("base64url")
}

export async function hasCreditPassword(): Promise<boolean> {
  return (await prisma.creditAccess.count({ where: { id: ACCESS_ID } })) > 0
}

export async function isCreditSessionValid(): Promise<boolean> {
  const access = await prisma.creditAccess.findUnique({ where: { id: ACCESS_ID } })
  if (!access) return false

  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const [expiresPart, signature] = token?.split(".") ?? []
  const expiresAt = Number(expiresPart)
  if (!signature || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return false

  const expected = Buffer.from(sessionSignature(expiresAt, access.passwordHash))
  const actual = Buffer.from(signature)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export async function requireCreditSession(): Promise<void> {
  if (!(await isCreditSessionValid())) {
    throw new Error("UNAUTHORIZED")
  }
}

export async function startCreditSession(passwordHash: string): Promise<void> {
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000
  ;(await cookies()).set(SESSION_COOKIE, `${expiresAt}.${sessionSignature(expiresAt, passwordHash)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: SESSION_HOURS * 60 * 60,
  })
}

export async function endCreditSession(): Promise<void> {
  ;(await cookies()).delete({ name: SESSION_COOKIE, path: "/admin" })
}

export type LoginOutcome =
  | { status: "ok"; passwordHash: string }
  | { status: "locked"; minutes: number }
  | { status: "wrong" }
  | { status: "not_set" }

export async function checkCreditPassword(password: string): Promise<LoginOutcome> {
  const access = await prisma.creditAccess.findUnique({ where: { id: ACCESS_ID } })
  if (!access) return { status: "not_set" }

  const now = Date.now()
  if (access.lockedUntil && access.lockedUntil.getTime() > now) {
    return { status: "locked", minutes: Math.ceil((access.lockedUntil.getTime() - now) / 60000) }
  }

  if (await verifyPassword(password, access.passwordHash)) {
    await prisma.creditAccess.update({
      where: { id: ACCESS_ID },
      data: { failedAttempts: 0, lockedUntil: null },
    })
    return { status: "ok", passwordHash: access.passwordHash }
  }

  const failedAttempts = access.failedAttempts + 1
  const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS
  await prisma.creditAccess.update({
    where: { id: ACCESS_ID },
    data: {
      failedAttempts: shouldLock ? 0 : failedAttempts,
      lockedUntil: shouldLock ? new Date(now + LOCK_MINUTES * 60000) : null,
    },
  })
  return shouldLock ? { status: "locked", minutes: LOCK_MINUTES } : { status: "wrong" }
}
