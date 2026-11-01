import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AuthCard } from "@/components/auth/auth-card"
import { LoginForm } from "@/components/auth/login-form"
import { landingPageFor } from "@/lib/permissions"
import { getCurrentUser } from "@/server/auth/session"

export const metadata: Metadata = { title: "כניסה | ניהול יקב מוניץ" }
export const dynamic = "force-dynamic"

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "" } = await searchParams
  const user = await getCurrentUser()
  if (user) redirect(user.mustChangePassword ? "/admin/account" : landingPageFor(user))

  return (
    <AuthCard title="כניסה למערכת הניהול">
      <LoginForm next={next} />
    </AuthCard>
  )
}
