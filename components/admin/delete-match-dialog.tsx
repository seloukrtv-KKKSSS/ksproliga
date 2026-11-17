"use client"

import { useEffect, useState } from "react"
import type { Match } from "@/lib/supabase"
import { getMatchDeletionPlan, type MatchDeletionPlan } from "@/lib/database"
import { tournamentError } from "@/lib/tournaments"
import { MutationDialog } from "./mutation-dialog"
import { LocalMatchDateTime } from "@/components/local-time"

export function DeleteMatchDialog({ match, onDelete, onClose }: { match: Match; onDelete: (plan: MatchDeletionPlan, dependents: boolean) => Promise<void>; onClose: () => void }) {
  const [plan, setPlan] = useState<MatchDeletionPlan | null>(null), [error, setError] = useState(""), [dependents, setDependents] = useState(false)
  useEffect(() => {
    let cancelled = false
    void getMatchDeletionPlan(match.id).then((value) => { if (!cancelled) setPlan(value) }).catch((cause) => { if (!cancelled) setError(tournamentError(cause)) })
    return () => { cancelled = true }
  }, [match.id])
  return <MutationDialog title="Видалити матч?" confirmLabel={dependents ? `Видалити матчі (${1 + (plan?.dependents.length || 0)})` : "Видалити матч"} disabled={!plan} error={error} onClose={onClose} onConfirm={async () => { if (plan) await onDelete(plan, dependents) }}>
    <p className="font-semibold">{match.home_team} — {match.away_team}</p><p className="text-slate-500"><LocalMatchDateTime match={match} mode="dateTime" /></p>
    <p>Разом із матчем видаляться його голи, картки та голосування. Статистика гравців перерахується.</p>
    {!plan && !error && <p role="status" className="text-slate-500">Перевіряємо зв’язки матчу…</p>}
    {plan && plan.dependents.length > 0 && <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p>Ця пара впливає на наступні матчі сітки. Майбутні матчі без результатів перерахуються автоматично. Якщо зміняться учасники вже зіграних матчів, видалення потребуватиме вибору нижче.</p>
      <ul className="max-h-48 space-y-2 overflow-y-auto">{plan.dependents.map((item) => <li key={item.id} className="text-xs"><strong>{item.home_team} — {item.away_team}</strong><span className="ml-2">{item.is_finished ? "Зіграно" : "Заплановано"}</span><div className="text-slate-500">{item.cup_stage} · <LocalMatchDateTime match={item} mode="date" /></div></li>)}</ul>
      <label className="flex items-start gap-2 font-semibold"><input type="checkbox" className="mt-1" checked={dependents} onChange={(event) => setDependents(event.target.checked)} />Також видалити перелічені залежні матчі та їхні протоколи</label>
    </div>}
  </MutationDialog>
}
