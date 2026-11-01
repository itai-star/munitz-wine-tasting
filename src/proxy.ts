import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isPublicPath, landingPageFor, meetsRequirement, requirementFor } from "@/lib/permissions"
import { SESSION_COOKIE, readSessionUser } from "@/server/auth/session"

// Files with an extension (images, icons, the manifest) and Next's own assets are served without a check.
export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)"],
}

const PASSWORD_CHANGE_PATHS = ["/admin/account", "/api/auth"]

function deny(request: NextRequest, status: 401 | 403): NextResponse {
  return NextResponse.json({ error: status === 401 ? "יש להתחבר" : "אין הרשאה" }, { status })
}

function wantsPage(request: NextRequest): boolean {
  return !request.nextUrl.pathname.startsWith("/api/") && !request.headers.has("next-action")
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  if (isPublicPath(pathname)) return NextResponse.next()

  const user = await readSessionUser(request.cookies.get(SESSION_COOKIE)?.value)

  if (!user) {
    if (!wantsPage(request)) return deny(request, 401)
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`)
    const response = NextResponse.redirect(loginUrl)
    // A cookie that no longer matches a session is dropped so the browser stops sending it.
    if (request.cookies.has(SESSION_COOKIE)) response.cookies.delete(SESSION_COOKIE)
    return response
  }

  if (user.mustChangePassword && !PASSWORD_CHANGE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return wantsPage(request) ? NextResponse.redirect(new URL("/admin/account", request.url)) : deny(request, 403)
  }

  if (!meetsRequirement(user, requirementFor(pathname))) {
    return wantsPage(request) ? NextResponse.redirect(new URL(landingPageFor(user), request.url)) : deny(request, 403)
  }

  return NextResponse.next()
}
