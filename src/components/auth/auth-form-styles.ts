export const inputClass =
  "w-full border border-stone-300 rounded-lg px-3 py-2.5 text-base focus:ring-2 focus:ring-wine/20 focus:border-wine outline-none"
export const labelClass = "block text-sm font-medium text-stone-700 mb-1"
export const primaryButtonClass =
  "bg-wine text-white px-8 py-2.5 rounded-lg hover:bg-wine-dark transition-colors font-medium disabled:opacity-50"
export const errorClass = "text-red-600 text-sm bg-red-50 px-3 py-2 rounded"
export const noticeClass = "text-emerald-700 text-sm bg-emerald-50 px-3 py-2 rounded"

type ApiAnswer = { ok?: boolean; error?: string; message?: string; redirect?: string }

export async function postJson(url: string, body: Record<string, unknown>): Promise<ApiAnswer> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const answer = (await response.json().catch(() => ({}))) as ApiAnswer
    return response.ok ? { ...answer, ok: true } : { error: answer.error ?? "הפעולה נכשלה, נסה שוב" }
  } catch {
    return { error: "אין חיבור לשרת, נסה שוב" }
  }
}
