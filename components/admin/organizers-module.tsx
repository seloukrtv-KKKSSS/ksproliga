"use client"

import type { Dispatch, FormEvent, SetStateAction } from "react"
import { Check, Edit, ShieldCheck, Trash2, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Championship, Organizer } from "@/lib/supabase"

export interface OrganizerFormState {
  name: string
  email: string
  championship_ids: number[]
}

interface OrganizersModuleProps {
  championships: Championship[]
  organizers: Organizer[]
  form: OrganizerFormState
  setForm: Dispatch<SetStateAction<OrganizerFormState>>
  editing: Organizer | null
  setEditing: Dispatch<SetStateAction<Organizer | null>>
  loading: boolean
  notice: { type: "success" | "error"; text: string } | null
  onSubmit: (event: FormEvent) => void
  onDelete: (userId: string) => void
  onToggleChampionship: (championshipId: number) => void
}

export function OrganizersModule({
  championships,
  organizers,
  form,
  setForm,
  editing,
  setEditing,
  loading,
  notice,
  onSubmit,
  onDelete,
  onToggleChampionship,
}: OrganizersModuleProps) {
  const reset = () => {
    setEditing(null)
    setForm({ name: "", email: "", championship_ids: [] })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="admin-step-card space-y-4">
        <div className="admin-step-card__heading">
          <span>1</span>
          <div>
            <h3><ShieldCheck /> {editing ? "Редагування організатора" : "Додати організатора"}</h3>
            <p>Вкажіть контакт, потім призначте доступні турніри.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="organizer-name" className="text-slate-700 font-semibold text-xs">Ім’я або назва</Label>
            <Input id="organizer-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Організатор Ліги" className="glass-input text-sm h-10 px-4" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizer-email" className="text-slate-700 font-semibold text-xs">Email</Label>
            <Input id="organizer-email" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value.toLowerCase() })} placeholder="organizer@example.com" className="glass-input text-sm h-10 px-4" required />
          </div>
        </div>

        {!editing && <div className="admin-inline-note">На цей email буде надіслано захищене запрошення. Організатор сам створить пароль.</div>}
        {notice && <div className={`admin-save-notice is-${notice.type}`} role="status">{notice.text}</div>}

        <div className="space-y-2">
          <Label className="text-slate-700 font-semibold text-xs">Доступні турніри</Label>
          {championships.length === 0 ? <div className="text-xs text-slate-400 italic">Спочатку створіть чемпіонат.</div> : (
            <div className="grid gap-2 sm:grid-cols-2">
              {championships.map((championship) => {
                const checked = form.championship_ids.includes(championship.id)
                return (
                  <button type="button" key={championship.id} onClick={() => onToggleChampionship(championship.id)} className={`admin-access-option ${checked ? "is-checked" : ""}`}>
                    <span>{checked && <Check />}</span>
                    {championship.name} ({championship.season})
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" disabled={loading} className="ios-btn-primary text-xs font-bold h-10 px-6">
            {loading ? "Збереження…" : editing ? "Зберегти зміни" : "Надіслати запрошення"}
          </Button>
          {editing && <Button type="button" variant="outline" onClick={reset}>Скасувати</Button>}
        </div>
      </form>

      <section className="admin-step-card space-y-3">
        <div className="admin-step-card__heading">
          <span>2</span>
          <div><h3><UserCheck /> Керування доступом</h3><p>Редагуйте призначення або закривайте доступ.</p></div>
        </div>
        {organizers.length === 0 ? <div className="text-center py-8 text-sm text-slate-500">Організаторів ще немає.</div> : organizers.map((organizer) => (
          <div key={organizer.user_id} className="admin-organizer-row">
            <div className="min-w-0">
              <strong>{organizer.name}</strong>
              <span>{organizer.email}</span>
              <div>
                {organizer.championship_ids.length ? organizer.championship_ids.map((championshipId) => (
                  <small key={championshipId}>{championships.find((item) => item.id === championshipId)?.name || `Турнір #${championshipId}`}</small>
                )) : <small className="is-warning">Немає призначених турнірів</small>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" aria-label={`Редагувати ${organizer.name}`} onClick={() => { setEditing(organizer); setForm({ name: organizer.name, email: organizer.email, championship_ids: organizer.championship_ids || [] }) }}><Edit /></Button>
              <Button size="sm" variant="destructive" aria-label={`Видалити ${organizer.name}`} onClick={() => onDelete(organizer.user_id)}><Trash2 /></Button>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
