export const PERMISSIONS = ["HARVEST", "INVENTORY", "REMOTE_CONTROL", "CREDIT", "TASTINGS", "SALES"] as const

export type PermissionKey = (typeof PERMISSIONS)[number]

export type UserRoleKey = "ADMIN" | "USER"

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  HARVEST: "ניהול בציר",
  INVENTORY: "ניהול מלאי",
  REMOTE_CONTROL: "בקרה מרחוק",
  CREDIT: "נתוני אשראי",
  TASTINGS: "טעימות יין",
  SALES: "סיכום חודשי",
}

export type SessionUser = {
  id: string
  username: string
  role: UserRoleKey
  permissions: PermissionKey[]
  mustChangePassword: boolean
}

export type Requirement = PermissionKey | "ADMIN" | "USER"

// An administrator can reach every function; a regular user only the ones granted to them.
export function canUse(user: Pick<SessionUser, "role" | "permissions">, permission: PermissionKey): boolean {
  return user.role === "ADMIN" || user.permissions.includes(permission)
}

export function meetsRequirement(user: Pick<SessionUser, "role" | "permissions">, requirement: Requirement): boolean {
  if (requirement === "USER") return true
  if (requirement === "ADMIN") return user.role === "ADMIN"
  return canUse(user, requirement)
}

const PUBLIC_EXACT = new Set(["/", "/login", "/forgot-password"])
const PUBLIC_PREFIXES = [
  "/tasting/",
  "/api/auth/login",
  "/api/auth/forgot-password",
  // The scheduled collection jobs carry no session; each route checks its own secret.
  "/api/remote-monitor/poll",
  "/api/vineyard-monitor/poll",
]

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

// Most specific entries first. An exact "/admin" is the harvest overview, so it is matched separately.
const REQUIREMENTS: [prefix: string, requirement: Requirement][] = [
  ["/admin/users", "ADMIN"],
  ["/admin/more", "USER"],
  ["/admin/account", "USER"],
  ["/admin/credit", "CREDIT"],
  ["/admin/monthly-summary", "SALES"],
  ["/admin/sessions", "TASTINGS"],
  ["/admin/tastings", "TASTINGS"],
  ["/admin/wines", "INVENTORY"],
  ["/admin/inventory", "INVENTORY"],
  ["/admin/vineyard-monitor", "REMOTE_CONTROL"],
  ["/admin/remote-monitor", "REMOTE_CONTROL"],
  ["/admin/intake", "HARVEST"],
  ["/admin/vineyard", "HARVEST"],
  ["/admin/fermentation", "HARVEST"],
  ["/admin/finished-wine", "HARVEST"],
  ["/admin/season-summary", "HARVEST"],
  ["/api/admin", "ADMIN"],
  ["/api/season-summary", "HARVEST"],
  ["/api/upload", "USER"],
  ["/api/auth", "USER"],
]

function underPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

// Anything not listed is treated as administrator-only, so a new page is closed until it is mapped.
export function requirementFor(pathname: string): Requirement {
  if (pathname === "/admin") return "HARVEST"
  const match = REQUIREMENTS.find(([prefix]) => underPrefix(pathname, prefix))
  return match ? match[1] : "ADMIN"
}

const LANDING_PAGES: [PermissionKey, string][] = [
  ["HARVEST", "/admin"],
  ["REMOTE_CONTROL", "/admin/vineyard-monitor"],
  ["INVENTORY", "/admin/inventory"],
  ["TASTINGS", "/admin/tastings"],
  ["CREDIT", "/admin/credit"],
  ["SALES", "/admin/monthly-summary"],
]

// The first screen the user is allowed to open, used after login and when a page is off limits.
export function landingPageFor(user: Pick<SessionUser, "role" | "permissions">): string {
  const landing = LANDING_PAGES.find(([permission]) => canUse(user, permission))
  return landing ? landing[1] : "/admin/more"
}
