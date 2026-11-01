// Credentials travel through route handlers (a server action's arguments are printed by the dev server),
// so these handlers refuse requests that were not sent from a page of this site.
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin")
  if (!origin) return false
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const body: unknown = await request.json().catch(() => null)
  return typeof body === "object" && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : null
}

export function text(value: unknown): string {
  return typeof value === "string" ? value : ""
}
