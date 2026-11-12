"use client"

import { useRef, useState } from 'react'
import type { Match, MatchGoal, MatchCard } from '@/lib/supabase'
import { playerNameKey } from '@/lib/player-stats'
import { summarizeMatchGoals, summarizePlayerEvents } from '@/lib/match-event-summary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type QuickEventType = 'goal' | 'yellow' | 'red'

export function MatchPlayerEvents({ match, squads, goals, cards, disabled, onAdd }: {
  match: Match
  squads: { team: string; names: string[] }[]
  goals: MatchGoal[]
  cards: MatchCard[]
  disabled: boolean
  onAdd: (team: string, name: string, type: QuickEventType) => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const inFlight = useRef(false)
  const totals = summarizeMatchGoals(match, goals)
  const eligible = match.is_finished && !match.is_technical_defeat
  const add = async (team: string, name: string, type: QuickEventType) => {
    if (inFlight.current || disabled || !eligible) return
    inFlight.current = true
    setSaving(true); setError(''); setNotice('')
    try {
      await onAdd(team, name, type)
      setNotice(`${name}: ${type === 'goal' ? 'гол' : type === 'yellow' ? 'жовту картку' : 'червону картку'} збережено.`)
    } catch (cause) {
      setError(cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : 'Не вдалося зберегти подію.')
    } finally { inFlight.current = false; setSaving(false) }
  }
  return <section className="space-y-3" aria-label="Швидке внесення подій зі складу">
    <h5 className="text-sm font-bold">Обрати гравців зі складу</h5>
    <p className="text-xs text-slate-600">Кожне натискання одразу зберігає одну подію й оновлює статистику. Для дубля натисніть «+ гол» двічі, дочекавшись збереження. Помилкову подію можна видалити у списку нижче.</p>
    <p className="text-sm font-semibold">Голи внесено: {totals.home} : {totals.away} · Рахунок матчу: {match.home_score ?? '—'} : {match.away_score ?? '—'}</p>
    {eligible && (totals.home !== match.home_score || totals.away !== match.away_score) && <p className="text-xs text-amber-800">Кількість подій голів ще не відповідає рахунку. Перевірте авторів голів; рахунок матчу тут не змінюється.</p>}
    {!eligible && <p role="alert" className="text-sm text-amber-800">Події доступні для завершеного матчу без технічної поразки.</p>}
    <Input type="search" aria-label="Знайти гравця у складах матчу" placeholder="Знайти гравця…" value={search} onChange={e => setSearch(e.target.value)} />
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <p role="status" className="text-xs text-emerald-800">{saving ? 'Збереження…' : notice}</p>
    <div className="grid gap-4 xl:grid-cols-2">
      {squads.map(({team,names}) => <div key={team} className="rounded-xl border border-slate-200 p-3">
        <h6 className="mb-3 font-bold">{team}</h6>
        {!names.length && <p className="text-xs text-slate-500">Спочатку додайте склад у розділі «Команди».</p>}
        {!!names.length && !names.some(name => playerNameKey(name).includes(playerNameKey(search))) && <p className="text-xs text-slate-500">Гравців за цим пошуком не знайдено.</p>}
        <div className="max-h-[28rem] space-y-2 overflow-y-auto">
          {names.filter(name => playerNameKey(name).includes(playerNameKey(search))).map(name => {
            const stats = summarizePlayerEvents(name,team,match.id,goals,cards)
            return <div key={name} className="space-y-2 rounded-lg bg-slate-50 p-3">
              <div className="break-words text-sm font-semibold">{name}</div>
              <div className="flex flex-wrap items-center gap-2">
                {(['goal','yellow','red'] as const).map(type => <Button key={type} type="button" size="sm" variant="outline" disabled={disabled || saving || !eligible}
                  className={type === 'goal' ? 'text-blue-700' : type === 'yellow' ? 'text-amber-800' : 'text-red-700'}
                  aria-label={`Додати ${type === 'goal' ? 'гол' : type === 'yellow' ? 'жовту картку' : 'червону картку'}: ${name} (${team})`}
                  onClick={() => void add(team,name,type)}>
                  {type === 'goal' ? '+ гол' : type === 'yellow' ? '+ жовта' : '+ червона'}
                  <span className="tabular-nums">({type === 'goal' ? stats.goals : type === 'yellow' ? stats.yellow : stats.red})</span>
                </Button>)}
              </div>
            </div>
          })}
        </div>
      </div>)}
    </div>
  </section>
}
