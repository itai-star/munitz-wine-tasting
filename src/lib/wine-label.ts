export function formatWineName(name: string, year: number | null): string {
  return year == null ? name : `${name} ${year}`
}
