"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Championship, Team } from "@/lib/supabase"
import { getCupStageLegs, buildCupFixtures, createCupConfig, cupSourceLabel, distributeCupGroups, getCupSeeds, type CupConfig, type CupFixture, type CupSource, type CupState } from "@/lib/cup"
import { getCupState, publishCupFormat, setCupStageLegs, scheduleCupFixture, tournamentError } from "@/lib/tournaments"

import { getCupPosterFixtures, type PosterData } from "@/lib/posters/model"

const PosterEditor = dynamic(() => import("@/components/posters/poster-editor"), { ssr: false })
const selectClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
function encodeSource(source: CupSource) { return source.kind === "team" ? `team:${source.teamId}` : source.kind === "group" ? `group:${source.groupId}:${source.rank}` : "bye" }
function decodeSource(value: string): CupSource { const [kind, id, rank] = value.split(":"); return kind === "team" ? { kind: "team", teamId: Number(id) } : kind === "group" ? { kind: "group", groupId: id, rank: Number(rank) } : { kind: "bye" } }

export function CupDesigner({ championshipId, teams, championship, onDataChange }: { championshipId: number; teams: Team[]; championship?: Championship; onDataChange?: () => void }) {
  const [poster, setPoster] = useState<PosterData | null>(null)
  const [state, setState] = useState<CupState | null>(null)
  const [config, setConfig] = useState<CupConfig>(() => createCupConfig(teams))
  const [groupCount, setGroupCount] = useState(2)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [schedule, setSchedule] = useState<CupFixture | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  useEffect(() => {
    let cancelled = false
    void getCupState(championshipId).then((next) => {
      if (cancelled) return
      setState(next)
      if (next.format) { setConfig(next.format.config); setGroupCount(next.format.config.groups.length || 2) }
    }).catch((e) => { if (!cancelled) setError(tournamentError(e)) })
    return () => { cancelled = true }
  }, [championshipId])
  const plan = useMemo(() => {
    try { return { fixtures: buildCupFixtures(config, teams), error: "" } }
    catch (e) { return { fixtures: [] as CupFixture[], error: tournamentError(e) } }
  }, [config, teams])
  const started = state?.matches.some((match) => match.cup_fixture_id && (match.is_finished || match.home_score != null || match.away_score != null))
  const seeds = getCupSeeds(config)
  const knockoutStages = [...new Map(plan.fixtures.filter((fixture) => fixture.stage > 0 && fixture.id !== "third-place").map((fixture) => [fixture.stage, fixture.label])).entries()]
  function change<K extends keyof CupConfig>(key: K, value: CupConfig[K], resetSeeds = false) { setConfig((previous) => ({ ...previous, [key]: value, ...(resetSeeds ? { seeds: [] } : {}) })); setPreviewOpen(false); setMessage("") }
  async function refresh() { const next = await getCupState(championshipId); setState(next); onDataChange?.(); return next }
  async function publish() {
    if (plan.error) { setError(plan.error); return }
    setBusy(true); setError(""); setMessage("")
    try {
      await publishCupFormat(championshipId, config, plan.fixtures, state?.format?.revision || 0)
      await refresh(); setPreviewOpen(false); setMessage("Кубок збережено. Матчі з відомими учасниками додані в календар; наступні з’являться після визначення переможців.")
    } catch (e) { setError(tournamentError(e)) }
    finally { setBusy(false) }
  }
  async function changePublishedStage(stage: number, legs: 1 | 2, thirdPlace: boolean) {
    if (!state?.format) return
    setBusy(true); setError(""); setMessage("")
    try { await setCupStageLegs(championshipId, stage, legs, state.format.revision, thirdPlace); const next = await refresh(); if (next.format) setConfig(next.format.config); setMessage("Кількість матчів стадії збережено. Календар наступних стадій узгоджено зі збереженням інтервалів.") }
    catch (e) { setError(tournamentError(e)) }
    finally { setBusy(false) }
  }
  async function saveSchedule() {
    if (!schedule || !state?.format) return
    setBusy(true); setError("")
    try { await scheduleCupFixture(championshipId, schedule, state.format.revision); await refresh(); setSchedule(null); setMessage("Дату та назву стадії оновлено.") }
    catch (e) { setError(tournamentError(e)) }
    finally { setBusy(false) }
  }
  return <section className="space-y-4">
    {poster && <PosterEditor {...poster} onClose={() => setPoster(null)} />}
    {state && <div className="flex justify-end"><Button variant="outline" disabled={!getCupPosterFixtures({ mode: "cup", matches: state.matches, teams, championship, cup: { config: state.format?.config, fixtures: state.fixtures } }).length} onClick={() => setPoster({ mode: "cup", matches: state.matches, teams, championship, cup: { config: state.format?.config, fixtures: state.fixtures } })}>Афіша кубка</Button></div>}
    <div className="admin-step-card space-y-2"><h3 className="text-lg font-bold">Конструктор кубка</h3><p className="text-sm text-slate-500">Налаштуйте формат, перевірте сітку й опублікуйте календар. Рахунки, пенальті та протоколи вносьте у вкладці «Матчі». За рівної суми двох матчів переможця визначають пенальті другого матчу; правило виїзного гола не застосовується.</p>{started && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Кубок уже розпочався. Структура захищена від перебудови; розклад кожної пари можна змінити нижче.</p>}</div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    {!state && !error && <p className="text-sm text-slate-500">Завантаження кубка…</p>}
    <fieldset disabled={busy || !state || started} className="admin-step-card space-y-5 disabled:opacity-70"><legend className="px-1 font-bold">1. Формат і учасники</legend>
      <label className="block space-y-1 text-sm">Формат<select aria-label="Формат кубка" className={selectClass} value={config.mode} onChange={(event) => { const mode = event.target.value as CupConfig["mode"]; setConfig({ ...config, mode, seeds: [], groups: mode !== "knockout" && !config.groups.length ? distributeCupGroups(config.teamIds, groupCount) : config.groups }); setPreviewOpen(false) }}><option value="knockout">На виліт</option><option value="groups_knockout">Групи + плейоф</option><option value="groups">Лише групи</option></select></label>
      <div className="flex flex-wrap items-center gap-2"><span className="mr-auto text-sm font-bold">Учасники ({config.teamIds.length})</span><Button type="button" variant="outline" size="sm" onClick={() => { change("teamIds", teams.map((team) => team.id), true); if (config.mode !== "knockout") change("groups", distributeCupGroups(teams.map((team) => team.id), groupCount), true) }}>Усі команди</Button></div>
      <div className="grid gap-3 sm:grid-cols-3">{teams.map((team) => <label key={team.id} className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={config.teamIds.includes(team.id)} onChange={(event) => { const ids = event.target.checked ? [...config.teamIds, team.id] : config.teamIds.filter((id) => id !== team.id); setConfig({ ...config, teamIds: ids, seeds: [], groups: config.mode === "knockout" ? config.groups : distributeCupGroups(ids, groupCount) }); setPreviewOpen(false) }} />{team.name}</label>)}</div>
      <div className="grid gap-4 sm:grid-cols-3"><label className="space-y-1 text-sm">Початок за Києвом<Input type="date" value={config.startDate} onChange={(event) => change("startDate", event.target.value)} /></label><label className="space-y-1 text-sm">Час за Києвом<Input type="time" value={config.time} onChange={(event) => change("time", event.target.value)} /></label><label className="space-y-1 text-sm">Днів між турами<Input type="number" min={0} max={60} value={config.intervalDays} onChange={(event) => change("intervalDays", Number(event.target.value))} /></label></div>
      {config.mode !== "knockout" && <div className="space-y-4 border-t pt-4"><h4 className="font-bold">2. Груповий етап</h4><div className="flex flex-wrap items-end gap-3"><label className="w-32 space-y-1 text-sm">Кількість груп<Input type="number" min={1} max={32} value={groupCount} onChange={(event) => setGroupCount(Number(event.target.value))} /></label><Button type="button" variant="outline" disabled={groupCount < 1 || groupCount > 32 || !Number.isInteger(groupCount)} onClick={() => change("groups", distributeCupGroups(config.teamIds, groupCount), true)}>Розподілити порівну</Button></div>
        <div className="grid gap-3 sm:grid-cols-2">{config.groups.map((group) => <label key={group.id} className="text-sm">Назва групи<Input maxLength={80} value={group.name} onChange={(event) => change("groups", config.groups.map((item) => item.id === group.id ? { ...item, name: event.target.value } : item))} /></label>)}</div>
        <div className="grid gap-3 sm:grid-cols-2">{teams.filter((team) => config.teamIds.includes(team.id)).map((team) => <label key={team.id} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 flex-1">{team.name}</span><select className={`${selectClass} max-w-44`} value={config.groups.find((group) => group.teamIds.includes(team.id))?.id || ""} onChange={(event) => change("groups", config.groups.map((group) => ({ ...group, teamIds: group.id === event.target.value ? [...group.teamIds.filter((id) => id !== team.id), team.id] : group.teamIds.filter((id) => id !== team.id) })), true)}><option value="" disabled>Оберіть групу</option>{config.groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>)}</div>
        <div className="grid gap-4 sm:grid-cols-3"><label className="text-sm">Очних матчів у груповому етапі<select className={selectClass} value={config.groupLegs} onChange={(event) => change("groupLegs", Number(event.target.value) as 1 | 2)}><option value={1}>1 матч із кожною командою</option><option value={2}>2 матчі · вдома / у гостях</option></select></label>{config.mode === "groups_knockout" && <label className="text-sm">Виходять із кожної групи<Input type="number" min={1} max={128} value={config.qualifiers} onChange={(event) => change("qualifiers", Number(event.target.value), true)} /></label>}<label className="text-sm">За рівності очок<select className={selectClass} value={config.tieBreak} onChange={(event) => change("tieBreak", event.target.value as CupConfig["tieBreak"])}><option value="difference">Різниця голів, перемоги, забиті</option><option value="wins">Перемоги, різниця голів, забиті</option></select></label></div>
        <div className="grid grid-cols-3 gap-3">{([["win", "За перемогу"], ["draw", "За нічию"], ["loss", "За поразку"]] as const).map(([key, label]) => <label key={key} className="text-sm">{label}<Input type="number" min={0} max={10} value={config.points[key]} onChange={(event) => change("points", { ...config.points, [key]: Number(event.target.value) })} /></label>)}</div><p className="text-xs text-slate-500">Технічний результат у групі: 3:0. Якщо всі показники рівні, вище команда, що раніше в списку групи.</p>
      </div>}
      {config.mode !== "groups" && <div className="space-y-4 border-t pt-4"><h4 className="font-bold">{config.mode === "knockout" ? "2" : "3"}. Плейоф і посів</h4><div className="space-y-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={config.thirdPlace} onChange={(event) => change("thirdPlace", event.target.checked)} />Матч за третє місце</label></div>
        <p className="text-xs text-slate-500">Посів 1 грає з останнім, 2 — з передостаннім. За непарної кількості учасників додаються пропуски раунду. Посів можна змінити вручну.</p>
        <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => change("seeds", [])}>Автоматичний посів</Button><Button type="button" size="sm" variant="outline" disabled={seeds.length >= 128} onClick={() => change("seeds", [...seeds, { kind: "bye" }])}>+ Місце в посіві</Button></div>
        <div className="grid gap-3 sm:grid-cols-2">{seeds.map((source, index) => <div key={index} className="flex items-center gap-2"><label className="flex min-w-0 flex-1 items-center gap-2 text-sm"><span className="w-7 shrink-0">{index + 1}.</span><select aria-label={`Учасник посіву ${index + 1}`} className={selectClass} value={encodeSource(source)} onChange={(event) => change("seeds", seeds.map((item, itemIndex) => itemIndex === index ? decodeSource(event.target.value) : item))}><option value="bye">Пропуск раунду</option>{teams.filter((team) => config.mode === "knockout" && config.teamIds.includes(team.id)).map((team) => <option key={team.id} value={`team:${team.id}`}>{team.name}</option>)}{config.mode !== "knockout" && config.groups.flatMap((group) => group.teamIds.map((_, rank) => <option key={`${group.id}-${rank}`} value={`group:${group.id}:${rank + 1}`}>{rank + 1} місце · {group.name}</option>))}</select></label><button type="button" aria-label={`Видалити місце ${index + 1}`} className="px-2 text-slate-500" onClick={() => change("seeds", seeds.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}</div>
        <div className="grid gap-3 sm:grid-cols-2">{knockoutStages.map(([stage, label], index) => <div key={stage} className="rounded-xl border p-3 space-y-2"><label className="block text-sm">Назва стадії {stage}<Input maxLength={80} value={config.stageNames[String(stage)] ?? label} onChange={(event) => change("stageNames", { ...config.stageNames, [stage]: event.target.value })} /></label><label className="block text-sm">Очних матчів у кожній парі<select aria-label={`Кількість матчів: ${label}`} className={selectClass} value={getCupStageLegs(config, stage, index === knockoutStages.length - 1)} onChange={(event) => change("stageLegs", { ...config.stageLegs, [stage]: Number(event.target.value) as 1 | 2 })}><option value={1}>1 матч</option><option value={2}>2 матчі · вдома / у гостях</option></select></label></div>)}</div>
        {config.thirdPlace && <label className="block text-sm">Очних матчів за третє місце<select aria-label="Кількість матчів: за третє місце" className={selectClass} value={config.stageLegs?.["third-place"] ?? 1} onChange={(event) => change("stageLegs", { ...config.stageLegs, "third-place": Number(event.target.value) as 1 | 2 })}><option value={1}>1 матч</option><option value={2}>2 матчі · вдома / у гостях</option></select></label>}
      </div>}
      {plan.error && <p className="text-sm text-amber-800">{plan.error}</p>}
      <Button type="button" disabled={Boolean(plan.error)} onClick={() => { setPreviewOpen(true); setError("") }}>Перевірити сітку й календар</Button>
    </fieldset>
    {previewOpen && !plan.error && !started && <div className="admin-step-card space-y-4"><h4 className="font-bold">Перегляд перед публікацією</h4><p className="text-sm text-slate-500">Пар: {plan.fixtures.length}. Попередні матчі, створені вручну, залишаться окремо. Перебудова замінює лише ще не розпочаті матчі конструктора.</p><div className="max-h-96 space-y-2 overflow-y-auto">{plan.fixtures.map((fixture) => <div key={fixture.id} className="rounded-xl border p-3 text-sm"><div className="mb-1 text-xs font-bold text-slate-500">{fixture.label} · {fixture.scheduled_date} · {fixture.legs === 2 ? "2 матчі" : "1 матч"}</div>{cupSourceLabel(fixture.home_source, config, teams, plan.fixtures)} — {cupSourceLabel(fixture.away_source, config, teams, plan.fixtures)}</div>)}</div><Button disabled={busy || !state} onClick={() => void publish()}>{busy ? "Створюємо…" : state?.format ? "Опублікувати оновлену структуру" : "Створити кубок і календар"}</Button></div>}
    {state?.format && state.fixtures.some((fixture) => fixture.stage > 0) && <div className="admin-step-card space-y-3"><h4 className="font-bold">Кількість матчів опублікованих стадій</h4><p className="text-sm text-slate-500">Зміни застосовуються одразу. Доступні стадії без рахунків, протоколів, голосувань і трансляцій; наступні стадії також мають бути ще не розпочаті.</p>{[...new Map(state.fixtures.filter((fixture) => fixture.stage > 0).map((fixture) => [fixture.id === "third-place" ? "third-place" : String(fixture.stage), fixture])).values()].map((fixture) => <label key={fixture.id} className="flex flex-wrap items-center gap-3 text-sm"><span className="min-w-40 flex-1 font-semibold">{fixture.label}</span><select aria-label={`Опублікована стадія: ${fixture.label}`} className={`${selectClass} sm:max-w-64`} value={fixture.legs} disabled={busy} onChange={(event) => void changePublishedStage(fixture.stage, Number(event.target.value) as 1 | 2, fixture.id === "third-place")}><option value={1}>1 матч</option><option value={2}>2 матчі · вдома / у гостях</option></select></label>)}</div>}
    {state?.fixtures.length ? <div className="admin-step-card space-y-3"><h4 className="font-bold">Опубліковані пари та розклад</h4><p className="text-sm text-slate-500">Учасники майбутніх стадій визначаться автоматично. Редагування дати тут оновлює обидва матчі пари.</p><div className="max-h-[36rem] space-y-2 overflow-y-auto">{state.fixtures.map((fixture) => <div key={fixture.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3"><div className="min-w-0 flex-1 text-sm"><div className="mb-1 text-xs font-bold text-slate-500">{fixture.label} · {fixture.scheduled_date}</div>{cupSourceLabel(fixture.home_source, state.format!.config, teams, state.fixtures)} — {cupSourceLabel(fixture.away_source, state.format!.config, teams, state.fixtures)}</div><Button variant="outline" size="sm" disabled={busy} onClick={() => setSchedule({ ...fixture, scheduled_time: fixture.scheduled_time?.slice(0, 5) || null })}>Розклад</Button></div>)}</div></div> : null}
    {schedule && <form onSubmit={(event) => { event.preventDefault(); void saveSchedule() }} className="admin-step-card space-y-4"><h4 className="font-bold">Розклад пари · {schedule.label}</h4><fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Назва стадії<Input required maxLength={80} value={schedule.label} onChange={(event) => setSchedule({ ...schedule, label: event.target.value })} /></label><label className="text-sm">Дата першого матчу<Input required type="date" value={schedule.scheduled_date} onChange={(event) => setSchedule({ ...schedule, scheduled_date: event.target.value })} /></label><label className="text-sm">Час за Києвом<Input type="time" value={schedule.scheduled_time || ""} onChange={(event) => setSchedule({ ...schedule, scheduled_time: event.target.value || null })} /></label>{schedule.legs === 2 && <label className="text-sm">Днів до другого матчу<Input required type="number" min={0} max={60} value={schedule.leg_gap_days} onChange={(event) => setSchedule({ ...schedule, leg_gap_days: Number(event.target.value) })} /></label>}</fieldset><div className="flex gap-2"><Button disabled={busy} type="submit">Зберегти розклад</Button><Button disabled={busy} variant="outline" type="button" onClick={() => setSchedule(null)}>Скасувати</Button></div></form>}
  </section>
}
