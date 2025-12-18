// Normalize package name by stripping trailing user suffix like "com.foo@10"
export function normalizePackageName(packageName: string): string {
  const match = packageName.match(/^(.*)@\d+$/)
  return match ? match[1] : packageName
}
