// Creates the first administrator, or resets the password of an existing user and makes them an active
// administrator again (the way back in if every administrator is locked out).
//
// Run it in your own terminal, so the password is typed there and never appears in a chat or a log:
//   pnpm admin:create
import { randomBytes, scrypt } from "node:crypto"
import { createInterface } from "node:readline/promises"
import { PrismaClient } from "@prisma/client"

const PERMISSIONS = ["HARVEST", "INVENTORY", "REMOTE_CONTROL", "CREDIT", "TASTINGS", "SALES", "GROWERS"]
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/

// Mirrors src/lib/password-policy.ts.
function passwordProblem(password) {
  if (password.length < 10) return "הסיסמה חייבת להכיל לפחות 10 תווים"
  if (password.length > 100) return "הסיסמה ארוכה מדי"
  if (!/^[\x21-\x7E]+$/.test(password)) return "רק אותיות באנגלית, ספרות וסימנים, בלי רווחים"
  if (!/[A-Z]/.test(password)) return "חסרה אות גדולה באנגלית"
  if (!/[a-z]/.test(password)) return "חסרה אות קטנה באנגלית"
  if (!/[0-9]/.test(password)) return "חסרה ספרה"
  return null
}

// Same format as src/server/auth/password.ts: base64 salt, a colon, base64 scrypt key.
function hashPassword(password) {
  const salt = randomBytes(16)
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) =>
      error ? reject(error) : resolve(`${salt.toString("base64")}:${key.toString("base64")}`)
    )
  })
}

function askHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question)
    const stdin = process.stdin
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding("utf8")
    let value = ""
    const onData = (chunk) => {
      for (const char of chunk) {
        // An empty Enter (the second half of a CR+LF pair, or a stray key press) is ignored.
        if ((char === "\r" || char === "\n") && value.length > 0) {
          stdin.setRawMode(false)
          stdin.pause()
          stdin.off("data", onData)
          process.stdout.write(` (${value.length} תווים)\n`)
          return resolve(value)
        }
        if (char === "\r" || char === "\n") continue
        if (char === "\u0003") process.exit(130)
        if (char === "\u007f" || char === "\b") {
          if (value.length > 0) process.stdout.write("\b \b")
          value = value.slice(0, -1)
        } else {
          value += char
          process.stdout.write("*")
        }
      }
    }
    stdin.on("data", onData)
  })
}

async function main() {
  const prisma = new PrismaClient()
  try {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const username = (await rl.question("שם משתמש (באנגלית): ")).trim().toLowerCase()
    rl.close()
    if (!USERNAME_PATTERN.test(username)) {
      throw new Error("שם המשתמש לא תקין: 3 עד 32 תווים באנגלית (אותיות, ספרות, נקודה, מקף או קו תחתון)")
    }

    const existing = await prisma.appUser.findUnique({ where: { username } })
    if (existing) console.log(`המשתמש ${username} כבר קיים. הסיסמה שלו תאופס והוא יהפוך למנהל פעיל.`)

    const password = await askHidden("סיסמה: ")
    const problem = passwordProblem(password)
    if (problem) throw new Error(problem)
    if (password !== (await askHidden("אימות סיסמה: "))) throw new Error("הסיסמאות אינן זהות")

    const passwordHash = await hashPassword(password)
    const data = {
      passwordHash,
      role: "ADMIN",
      permissions: PERMISSIONS,
      isActive: true,
      mustChangePassword: false,
      failedAttempts: 0,
      lockedUntil: null,
    }
    if (existing) {
      await prisma.appUser.update({ where: { id: existing.id }, data })
      await prisma.userSession.deleteMany({ where: { userId: existing.id } })
    } else {
      await prisma.appUser.create({ data: { username, ...data } })
    }
    console.log(`בוצע. אפשר להיכנס עם המשתמש ${username}.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(`שגיאה: ${error.message}`)
  process.exitCode = 1
})
