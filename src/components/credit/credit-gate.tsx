import { CREDIT_PASSWORD_MIN_LENGTH, hasCreditPassword, isCreditSessionValid } from "@/server/credit-auth"
import { CreditLoginForm, CreditSetupForm } from "@/components/credit/credit-access-forms"

// Checked on every render of the page: layouts are not re-run between client navigations,
// so the gate has to wrap the page content itself.
export async function CreditGate({ children }: { children: React.ReactNode }) {
  if (!(await hasCreditPassword())) {
    return <CreditSetupForm minLength={CREDIT_PASSWORD_MIN_LENGTH} />
  }
  if (!(await isCreditSessionValid())) {
    return <CreditLoginForm />
  }
  return <>{children}</>
}
