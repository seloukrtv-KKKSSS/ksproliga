import type { Player } from "./supabase"

export function normalizePlayerName(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ")
}

export function playerNameKey(value: string): string {
  return normalizePlayerName(value).toLocaleLowerCase("uk")
}

export function normalizeRoster(names: string[]): string[] {
  const seen = new Set<string>()
  return names.map(normalizePlayerName).filter((name) => {
    const key = playerNameKey(name)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function validatePlayerStats(values: Partial<Player>): void {
  for (const field of ["goals", "yellow_cards", "red_cards"] as const) {
    const value = values[field]
    if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > 2_147_483_647)) {
      throw new Error("Голи та картки мають бути цілими невід’ємними числами.")
    }
  }
  if (values.name !== undefined && !normalizePlayerName(values.name)) {
    throw new Error("Вкажіть ім’я гравця.")
  }
  if (values.team !== undefined && !values.team.trim()) {
    throw new Error("Оберіть команду гравця.")
  }
}

export function normalizePlayerStats(player: Player): Player {
  return { ...player, goals: player.goals ?? 0, yellow_cards: player.yellow_cards ?? 0, red_cards: player.red_cards ?? 0 }
}
