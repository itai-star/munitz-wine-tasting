import { NextResponse } from "next/server"
import { runBankImport } from "@/server/bank/run-bank-import"

export const dynamic = "force-dynamic"

// A route handler rather than a server action: in development Next prints a server action's
// arguments to the log, which would write the bank credentials in plain text.
export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json().catch(() => null)
  const result = await runBankImport(body)
  return NextResponse.json(result)
}
