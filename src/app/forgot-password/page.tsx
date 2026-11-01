import type { Metadata } from "next"
import { AuthCard } from "@/components/auth/auth-card"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export const metadata: Metadata = { title: "שכחתי סיסמה | ניהול יקב מוניץ" }

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="שכחתי סיסמה">
      <ForgotPasswordForm />
    </AuthCard>
  )
}
