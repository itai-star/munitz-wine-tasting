import fs from "node:fs"
import path from "node:path"
import type { Browser, Page } from "puppeteer-core"

// Runs only on the owner's computer: it drives a visible browser through the bank's own login
// page. Credentials are typed into that page once and are never stored or logged here.

const LOGIN_URL = "https://www.mizrahi-tefahot.co.il/login/index.html#/auth-page-he"
const APP_URL_PREFIX = "https://mto.mizrahi-tefahot.co.il/OnlineApp"
const API_BASE = "https://mto.mizrahi-tefahot.co.il/Online/api"
const XSRF_HEADER = "mizrahixsrftoken"
const USERNAME_SELECTOR = "#userNumberDesktopHeb"
const PASSWORD_SELECTOR = "#passwordDesktopHeb"
const SUBMIT_SELECTOR = "#applogin-he"
const INVALID_LOGIN_SELECTOR = 'a[href*="SCServices/SC/P010.aspx"]'
const CHANGE_PASSWORD_URL = /mizrahi-tefahot\.co\.il\/login\/index\.html#\/change/
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000
const POLL_MS = 500
const TOKEN_TIMEOUT_MS = 30_000
const BROWSER_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
]
// Keeps the bank's "known device" cookie between runs so the SMS step appears less often.
// Git-ignored; delete the folder to forget the device.
const PROFILE_DIR = path.join(process.cwd(), ".bank-profile")

export type BankLoginFailure = "WRONG_CREDENTIALS" | "CHANGE_PASSWORD" | "TIMEOUT" | "NO_BROWSER" | "NO_TOKEN"

export class BankSessionError extends Error {
  constructor(readonly reason: BankLoginFailure) {
    super(reason)
  }
}

export type BankSession = {
  postJson: (endpoint: string, body: Record<string, unknown>) => Promise<unknown>
  close: () => Promise<void>
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function typeInto(page: Page, selector: string, value: string): Promise<void> {
  await page.waitForSelector(selector, { visible: true })
  await page.click(selector, { count: 3 })
  await page.type(selector, value, { delay: 35 })
}

async function waitForLoginResult(page: Page): Promise<void> {
  const deadline = Date.now() + LOGIN_TIMEOUT_MS
  while (Date.now() < deadline) {
    const url = page.url()
    if (url.startsWith(APP_URL_PREFIX)) return
    if (CHANGE_PASSWORD_URL.test(url)) throw new BankSessionError("CHANGE_PASSWORD")
    if (await page.$(INVALID_LOGIN_SELECTOR).catch(() => null)) {
      throw new BankSessionError("WRONG_CREDENTIALS")
    }
    await sleep(POLL_MS)
  }
  throw new BankSessionError("TIMEOUT")
}

export async function openMizrahiSession(credentials: {
  username: string
  password: string
}): Promise<BankSession> {
  const executablePath = BROWSER_PATHS.find((candidate) => fs.existsSync(candidate))
  if (!executablePath) throw new BankSessionError("NO_BROWSER")

  const { default: puppeteer } = await import("puppeteer-core")
  fs.mkdirSync(PROFILE_DIR, { recursive: true })
  const browser: Browser = await puppeteer.launch({
    executablePath,
    headless: false,
    defaultViewport: null,
    userDataDir: PROFILE_DIR,
    args: ["--start-maximized"],
  })

  try {
    const [page] = await browser.pages()
    const captured: { token: string | null; contentType: string } = {
      token: null,
      contentType: "application/json;charset=UTF-8",
    }
    page.on("request", (request) => {
      const token = request.headers()[XSRF_HEADER]
      if (token && request.url().includes("/Online/api/")) {
        captured.token = token
        captured.contentType = request.headers()["content-type"] ?? captured.contentType
      }
    })

    await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded" })
    await typeInto(page, USERNAME_SELECTOR, credentials.username)
    await typeInto(page, PASSWORD_SELECTOR, credentials.password)
    await page.click(SUBMIT_SELECTOR)
    // If the bank asks for an SMS code, the user completes it in this same window.
    await waitForLoginResult(page)

    const tokenDeadline = Date.now() + TOKEN_TIMEOUT_MS
    while (!captured.token && Date.now() < tokenDeadline) await sleep(POLL_MS)
    if (!captured.token) throw new BankSessionError("NO_TOKEN")
    const token = captured.token

    return {
      postJson: (endpoint, body) =>
        page.evaluate(
          async (url, payload, headers) => {
            const response = await fetch(url, {
              method: "POST",
              credentials: "include",
              headers,
              body: JSON.stringify(payload),
            })
            return response.json()
          },
          `${API_BASE}/${endpoint}`,
          body,
          { "Content-Type": captured.contentType, [XSRF_HEADER]: token }
        ),
      close: () => browser.close(),
    }
  } catch (error) {
    await browser.close().catch(() => undefined)
    throw error
  }
}
