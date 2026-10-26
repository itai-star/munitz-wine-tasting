// One-time helper: opens a visible browser on the bank site and records how the pages and
// their data requests are built, so the automatic import can be written afterwards.
//
// The user types the credentials and the SMS code directly into the bank's own page. This
// script never sees them: login/OTP traffic is not recorded and every sensitive-looking
// field is redacted. Output stays in .bank-discovery/ (git-ignored) on this computer.
import { createHash } from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import puppeteer from "puppeteer-core"

const LOGIN_URL = "https://www.mizrahi-tefahot.co.il/login/index.html#/auth-page-he"
const BANK_DOMAIN = "mizrahi-tefahot.co.il"
const BROWSER_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
]
const MAX_BODY_BYTES = 500_000
const MAX_SNAPSHOTS = 80
const SNAPSHOT_INTERVAL_MS = 2500
const SKIP_BODY_URL = /login|auth|otp|sms|password|token|identif|verify|step-?up/i
const SENSITIVE_KEY = /pass|pwd|secret|token|otp|auth|user|login|pin|cookie|session/i

const startedAt = new Date().toISOString().replace(/[:.]/g, "-")
const outDir = path.join(process.cwd(), ".bank-discovery", startedAt)
fs.mkdirSync(path.join(outDir, "snapshots"), { recursive: true })

const requests = []
const timeline = []
const snapshotHashes = new Set()
let snapshotCount = 0

function redact(value) {
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [
        key,
        SENSITIVE_KEY.test(key) ? "[redacted]" : redact(inner),
      ])
    )
  }
  return value
}

function redactBody(raw, contentType) {
  if (!raw) return null
  try {
    if (/json/i.test(contentType) || /^[\[{]/.test(raw.trim())) return redact(JSON.parse(raw))
    if (/x-www-form-urlencoded/i.test(contentType)) {
      const params = new URLSearchParams(raw)
      return Object.fromEntries([...params].map(([k, v]) => [k, SENSITIVE_KEY.test(k) ? "[redacted]" : v]))
    }
  } catch {
    return "[unparsed body omitted]"
  }
  return "[non-json body omitted]"
}

async function recordResponse(response) {
  const request = response.request()
  const url = request.url()
  const type = request.resourceType()
  if (!url.includes(BANK_DOMAIN) || !["xhr", "fetch", "document"].includes(type)) return

  const entry = {
    time: new Date().toISOString(),
    method: request.method(),
    url,
    type,
    status: response.status(),
    requestHeaderNames: Object.keys(request.headers()),
    requestBody: null,
    responseBody: null,
  }

  if (!SKIP_BODY_URL.test(url)) {
    entry.requestBody = redactBody(request.postData(), request.headers()["content-type"] ?? "")
    const contentType = response.headers()["content-type"] ?? ""
    if (/json|text|xml|html/i.test(contentType)) {
      try {
        const text = await response.text()
        entry.responseBody =
          text.length > MAX_BODY_BYTES
            ? `[omitted: ${text.length} bytes]`
            : /json/i.test(contentType)
              ? redactBody(text, contentType)
              : type === "document"
                ? "[html document, see snapshots]"
                : text
      } catch {
        entry.responseBody = "[unavailable]"
      }
    }
  } else {
    entry.requestBody = "[login/otp request: not recorded]"
    entry.responseBody = "[login/otp response: not recorded]"
  }
  requests.push(entry)
}

async function snapshotFrame(frame, label) {
  try {
    const html = await frame.evaluate(() => {
      const clone = document.documentElement.cloneNode(true)
      clone.querySelectorAll("script, style, noscript, svg, link, meta").forEach((node) => node.remove())
      clone.querySelectorAll("input").forEach((input) => input.removeAttribute("value"))
      return clone.outerHTML.slice(0, 600000)
    })
    const hash = createHash("sha1").update(html).digest("hex")
    if (snapshotHashes.has(hash) || snapshotCount >= MAX_SNAPSHOTS) return
    snapshotHashes.add(hash)
    snapshotCount += 1
    const name = `${String(snapshotCount).padStart(3, "0")}-${label}.html`
    fs.writeFileSync(path.join(outDir, "snapshots", name), `<!-- ${frame.url()} -->\n${html}`)
    timeline.push({ time: new Date().toISOString(), snapshot: name, url: frame.url() })
  } catch {
    // frame navigated away or is cross-origin: skip it
  }
}

async function snapshotAll(browser) {
  for (const page of await browser.pages()) {
    if (!page.url().includes(BANK_DOMAIN)) continue
    for (const [index, frame] of page.frames().entries()) {
      await snapshotFrame(frame, index === 0 ? "page" : `frame${index}`)
    }
  }
}

function writeReport() {
  fs.writeFileSync(path.join(outDir, "network.json"), JSON.stringify(requests, null, 2))
  fs.writeFileSync(path.join(outDir, "timeline.json"), JSON.stringify(timeline, null, 2))
  const lines = requests.map((r) => `${r.status} ${r.method} ${r.url.slice(0, 160)}`)
  fs.writeFileSync(path.join(outDir, "summary.txt"), lines.join("\n"))
  console.log(`Saved ${requests.length} requests and ${snapshotCount} page snapshots to ${outDir}`)
}

async function main() {
  const executablePath = BROWSER_CANDIDATES.find((candidate) => fs.existsSync(candidate))
  if (!executablePath) throw new Error("No Edge or Chrome installation found")

  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "bank-discovery-"))
  const browser = await puppeteer.launch({
    executablePath,
    headless: false,
    defaultViewport: null,
    userDataDir: profileDir,
    args: ["--start-maximized"],
  })

  const attach = (page) => page.on("response", (response) => void recordResponse(response))
  browser.on("targetcreated", async (target) => {
    const page = await target.page().catch(() => null)
    if (page) attach(page)
  })
  const [firstPage] = await browser.pages()
  attach(firstPage)
  await firstPage.goto(LOGIN_URL, { waitUntil: "domcontentloaded" })

  console.log("Browser is open. Log in yourself, go through the SMS step, open the credit card")
  console.log("pages you normally use, then close the browser window to finish.")

  const timer = setInterval(() => void snapshotAll(browser), SNAPSHOT_INTERVAL_MS)
  await new Promise((resolve) => browser.on("disconnected", resolve))
  clearInterval(timer)
  writeReport()
  fs.rmSync(profileDir, { recursive: true, force: true })
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
