"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SafeImage } from "@/components/safe-image"
import { SPONSOR_PLACEMENTS, getTournamentSponsors, saveTournamentSponsor, deleteTournamentSponsor, tournamentError, type TournamentSponsor } from "@/lib/tournaments"

type SponsorForm = Omit<TournamentSponsor, "id"> & { id?: number }

export function TournamentSponsorsModule({ championshipId, onDataChange }: { championshipId: number; onDataChange?: () => void }) {
  const [sponsors, setSponsors] = useState<TournamentSponsor[]>([])
  const [form, setForm] = useState<SponsorForm | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    void getTournamentSponsors(championshipId).then((data) => { if (!cancelled) setSponsors(data) }).catch((e) => { if (!cancelled) setError(tournamentError(e)) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [championshipId])
  async function save() {
    if (!form) return
    setBusy(true); setError(""); setMessage("")
    try { await saveTournamentSponsor(form); setSponsors(await getTournamentSponsors(championshipId)); setForm(null); setMessage("Налаштування спонсора збережено."); onDataChange?.() }
    catch (e) { setError(tournamentError(e)) }
    finally { setBusy(false) }
  }
  async function remove(sponsor: TournamentSponsor) {
    if (!window.confirm(`Видалити спонсора «${sponsor.name}» із цього турніру?`)) return
    setBusy(true); setError("")
    try { await deleteTournamentSponsor(sponsor.id, championshipId); setSponsors((items) => items.filter((item) => item.id !== sponsor.id)); if (form?.id === sponsor.id) setForm(null); onDataChange?.() }
    catch (e) { setError(tournamentError(e)) }
    finally { setBusy(false) }
  }
  return <section className="space-y-4">
    <div className="admin-step-card space-y-3"><h3 className="font-bold">Титульні спонсори цього турніру</h3><p className="text-sm text-slate-500">Логотипи з URL у компактній смузі над вмістом вибраних сторінок. Перший за порядком партнер стає головним у нових афішах.</p><Button disabled={busy || loading} onClick={() => { setError(""); setForm({ championship_id: championshipId, name: "", logo_url: "", website_url: null, placements: SPONSOR_PLACEMENTS.map(([id]) => id), sort_order: sponsors.length, is_active: true }) }}>+ Додати спонсора</Button></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    {form && <form onSubmit={(event) => { event.preventDefault(); void save() }} className="admin-step-card space-y-4">
      <fieldset disabled={busy} className="space-y-4"><legend className="mb-3 font-bold">{form.id ? "Редагування спонсора" : "Новий спонсор"}</legend>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm">Назва<Input required maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label className="space-y-1 text-sm">Порядок (менше — раніше)<Input type="number" min={0} max={1000} required value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} /></label></div>
        <label className="block space-y-1 text-sm">URL логотипа<Input type="url" required maxLength={4096} placeholder="https://…/logo.png" value={form.logo_url} onChange={(event) => setForm({ ...form, logo_url: event.target.value })} /></label>
        <label className="block space-y-1 text-sm">Сайт спонсора (за бажанням)<Input type="url" maxLength={4096} placeholder="https://…" value={form.website_url || ""} onChange={(event) => setForm({ ...form, website_url: event.target.value || null })} /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Показувати спонсора</label>
        <div className="flex flex-wrap items-center gap-2"><span className="mr-auto text-sm font-bold">Де показувати</span><Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, placements: SPONSOR_PLACEMENTS.map(([id]) => id) })}>Усі сторінки</Button><Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, placements: [] })}>Прибрати з усіх</Button></div>
        <div className="grid gap-3 sm:grid-cols-3">{SPONSOR_PLACEMENTS.map(([id, label]) => <label key={id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.placements.includes(id)} onChange={(event) => setForm({ ...form, placements: event.target.checked ? [...form.placements, id] : form.placements.filter((item) => item !== id) })} />{label}</label>)}</div>
        <div className="flex gap-2"><Button type="submit">{busy ? "Зберігаємо…" : "Зберегти"}</Button><Button type="button" variant="outline" onClick={() => setForm(null)}>Скасувати</Button></div>
      </fieldset>
    </form>}
    {loading && <p className="text-sm text-slate-500">Завантаження партнерів…</p>}
    {sponsors.map((sponsor) => <article key={sponsor.id} className="admin-step-card flex flex-wrap items-center gap-4"><SafeImage src={sponsor.logo_url} alt={sponsor.name} unoptimized width={160} height={64} className="h-16 w-40 rounded-lg bg-white p-1 object-contain" /><div className="min-w-0 flex-1"><h4 className="font-bold">{sponsor.name}</h4><p className="text-xs text-slate-500">{sponsor.is_active ? `Вибрано сторінок: ${sponsor.placements.length}` : "Показ вимкнено"} · Порядок {sponsor.sort_order}</p></div><Button variant="outline" disabled={busy} onClick={() => { setForm({ ...sponsor }); setMessage(""); setError("") }}>Редагувати</Button><Button variant="outline" disabled={busy} onClick={() => void remove(sponsor)}>Видалити</Button></article>)}
  </section>
}
