"use client"

import { useMemo, useRef, useState } from "react"
import { Edit, Plus, Save, Search, Trash2 } from "lucide-react"
import { addPlayer, deletePlayer, logOrganizerAction, updatePlayer } from "@/lib/database"
import { normalizePlayerName, playerNameKey } from "@/lib/player-stats"
import type { Player, Team } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type StatKey = "goals" | "yellow_cards" | "red_cards"
const STAT_FIELDS: { key: StatKey; label: string }[] = [
  { key: "goals", label: "Голи" },
  { key: "yellow_cards", label: "Жовті картки" },
  { key: "red_cards", label: "Червоні картки" },
]
const emptyForm = () => ({ name: "", team: "", goals: "0", yellow_cards: "0", red_cards: "0" })

interface PlayerStatisticsModuleProps {
  players: Player[]
  teams: Team[]
  championshipId: number
  organizerName?: string
  onChange: () => Promise<void>
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message
  return "Не вдалося зберегти зміни. Спробуйте ще раз."
}

export function PlayerStatisticsModule({ players, teams, championshipId, organizerName, onChange }: PlayerStatisticsModuleProps) {
  const [form, setForm] = useState(emptyForm)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [query, setQuery] = useState("")
  const [teamFilter, setTeamFilter] = useState("")
  const [sortBy, setSortBy] = useState<StatKey | "name">("name")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const formRef = useRef<HTMLFormElement>(null)

  const filteredPlayers = useMemo(() => {
    const search = playerNameKey(query)
    return players.filter((player) => (!teamFilter || player.team === teamFilter)
      && (!search || playerNameKey(`${player.name} ${player.team}`).includes(search)))
      .sort((a, b) => (sortBy === "name" ? 0 : (b[sortBy] ?? 0) - (a[sortBy] ?? 0))
        || a.name.localeCompare(b.name, "uk") || a.id - b.id)
  }, [players, query, teamFilter, sortBy])

  const resetForm = () => {
    setEditingPlayer(null)
    setForm(emptyForm())
    setError("")
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving) return
    setError("")
    setNotice("")
    const name = normalizePlayerName(form.name)
    if (!name || name.length > 255) {
      setError("Вкажіть ім’я гравця довжиною від 1 до 255 символів.")
      return
    }
    if (!teams.some((team) => team.name === form.team)) {
      setError("Оберіть команду цього турніру.")
      return
    }
    if (STAT_FIELDS.some(({ key }) => !/^\d+$/.test(form[key])
      || !Number.isSafeInteger(Number(form[key])) || Number(form[key]) > 2147483647)) {
      setError("Голи та картки мають бути цілими невід’ємними числами.")
      return
    }
    if (players.some((player) => player.id !== editingPlayer?.id && player.team === form.team
      && playerNameKey(player.name) === playerNameKey(name))) {
      setError("Цей гравець уже є в команді. Знайдіть його у списку та натисніть «Редагувати».")
      return
    }
    setSaving(true)
    try {
      const stats = { goals: Number(form.goals), yellow_cards: Number(form.yellow_cards), red_cards: Number(form.red_cards) }
      if (editingPlayer) {
        await updatePlayer(editingPlayer.id, stats)
      } else {
        await addPlayer({ name, team: form.team, ...stats, championship_id: championshipId })
      }
      await logOrganizerAction(organizerName || "Адміністратор", editingPlayer ? "update_player" : "create_player",
        `${editingPlayer ? "Оновлено статистику" : "Додано гравця"}: ${name} (${form.team}); голи ${stats.goals}, жовті ${stats.yellow_cards}, червоні ${stats.red_cards}`)
      await onChange()
      resetForm()
      setNotice(`Статистику гравця ${name} збережено.`)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (player: Player) => {
    if (saving || !window.confirm(`Видалити гравця ${player.name} та його підсумки? Видалення доступне лише для гравців поза складом команди, які не мають подій у матчах.`)) return
    setSaving(true)
    setError("")
    setNotice("")
    try {
      await deletePlayer(player.id)
      await logOrganizerAction(organizerName || "Адміністратор", "delete_player", `Видалено гравця: ${player.name} (${player.team})`)
      await onChange()
      if (editingPlayer?.id === player.id) resetForm()
      setNotice(`Гравця ${player.name} видалено.`)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-slate-700">
        <h3 className="font-bold text-slate-900">Статистика гравців</h3>
        <p className="mt-1">Збережіть список у «Команди → Склад команди» — гравці з’являться тут автоматично. Можна також додати гравця окремо.</p>
        <p className="mt-2">Голи та картки з матчів автоматично змінюють підсумки. Тут можна виправити загальну кількість за цей турнір. Автоголи до забитих голів гравця не входять.</p>
      </div>

      <form ref={formRef} onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <h4 className="font-bold text-slate-900">{editingPlayer ? `Редагування: ${editingPlayer.name}` : "Додати гравця"}</h4>
        <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="player-name">Ім’я гравця</Label>
            <Input id="player-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}
              required maxLength={255} readOnly={Boolean(editingPlayer)} className="mt-1 read-only:bg-slate-50" />
          </div>
          <div>
            <Label htmlFor="player-team">Команда</Label>
            <select id="player-team" value={form.team} onChange={(event) => setForm({ ...form, team: event.target.value })}
              required disabled={Boolean(editingPlayer) || saving} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 disabled:bg-slate-50">
              <option value="">Оберіть команду</option>
              {teams.map((team) => <option key={team.id} value={team.name}>{team.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-3">
            {STAT_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <Label htmlFor={`player-${key}`}>{label}</Label>
                <Input id={`player-${key}`} type="number" inputMode="numeric" min="0" max="2147483647" step="1" required
                  value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1" />
              </div>
            ))}
          </div>
        </fieldset>
        {editingPlayer && <p className="text-xs text-slate-500">Ви редагуєте підсумки наявного гравця. Ім’я та команда зберігають зв’язок зі складом і подіями матчів.</p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>{editingPlayer ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{saving ? "Збереження…" : editingPlayer ? "Зберегти статистику" : "Додати гравця"}</Button>
          {editingPlayer && <Button type="button" variant="outline" disabled={saving} onClick={resetForm}>Скасувати</Button>}
        </div>
      </form>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="admin-player-search" className="flex items-center gap-1.5"><Search className="h-3.5 w-3.5" />Пошук гравця</Label>
            <Input id="admin-player-search" type="search" placeholder="Ім’я або команда" value={query} onChange={(event) => setQuery(event.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="admin-player-team-filter">Команда</Label>
            <select id="admin-player-team-filter" value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
              <option value="">Усі команди</option>
              {teams.map((team) => <option key={team.id} value={team.name}>{team.name}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="admin-player-sort">Сортування</Label>
            <select id="admin-player-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value as StatKey | "name")} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
              <option value="name">За ім’ям</option>
              {STAT_FIELDS.map(({ key, label }) => <option key={key} value={key}>{label}: від більшого</option>)}
            </select>
          </div>
        </div>
        <p className="text-xs text-slate-500" role="status">Показано {filteredPlayers.length} із {players.length} гравців</p>
        <div className="space-y-2">
          {!filteredPlayers.length && <p className="py-6 text-center text-sm text-slate-500">{players.length ? "За цими умовами гравців не знайдено." : "Додайте склад команди або першого гравця вище."}</p>}
          {filteredPlayers.map((player) => {
            const isInRoster = teams.some((team) => team.name === player.team
              && team.roster?.some((name) => playerNameKey(name) === playerNameKey(player.name)))
            return (
            <div key={player.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="break-words font-semibold text-slate-900">{player.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{player.team}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold tabular-nums">
                  <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">Голи: {player.goals}</span>
                  <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-800">Жовті: {player.yellow_cards ?? 0}</span>
                  <span className="rounded-md bg-red-50 px-2 py-1 text-red-700">Червоні: {player.red_cards ?? 0}</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => {
                  setEditingPlayer(player)
                  setForm({ name: player.name, team: player.team, goals: String(player.goals), yellow_cards: String(player.yellow_cards ?? 0), red_cards: String(player.red_cards ?? 0) })
                  setError("")
                  setNotice("")
                  formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
                  formRef.current?.querySelector<HTMLInputElement>("#player-goals")?.focus({ preventScroll: true })
                }} aria-label={`Редагувати статистику: ${player.name}`}><Edit className="h-4 w-4" />Редагувати</Button>
                <Button type="button" size="sm" variant="outline" disabled={saving || isInRoster} onClick={() => void remove(player)} aria-label={`Видалити гравця: ${player.name}`}
                  title={isInRoster ? "Спочатку приберіть гравця зі складу команди. Статистику можна редагувати." : "Видалити гравця без подій у матчах"}
                  className="border-red-200 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
