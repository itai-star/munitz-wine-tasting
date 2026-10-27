"use server"

export async function isBankImportAvailable(): Promise<boolean> {
  return !process.env.VERCEL
}
