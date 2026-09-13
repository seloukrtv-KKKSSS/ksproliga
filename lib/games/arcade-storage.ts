export function readArcadeValue(key: string, fallback = "") {
  try {
    return window.localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}
export function writeArcadeValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}
export function readArcadeBest(key: string) {
  const number = Number(readArcadeValue(key, "0"))
  return Number.isSafeInteger(number) && number > 0 ? number : 0
}
