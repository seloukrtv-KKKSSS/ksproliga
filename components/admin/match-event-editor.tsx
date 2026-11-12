"use client"
import {useEffect,useRef,useState} from 'react'
import type {Match,MatchGoal,MatchCard} from '@/lib/supabase'
import {updateMatchGoal,updateMatchCard} from '@/lib/database'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'

export type EditableMatchEvent = {kind:'goal';event:MatchGoal}|{kind:'card';event:MatchCard}

export function MatchEventEditor({item,match,namesForTeam,onClose,onSaved}:{item:EditableMatchEvent;match:Match;namesForTeam:(team:string)=>string[];onClose:()=>void;onSaved:()=>Promise<void>}){
 const dialog=useRef<HTMLDialogElement>(null)
 const busy=useRef(false)
 const [saving,setSaving]=useState(false)
 const [error,setError]=useState('')
 const [team,setTeam]=useState(item.event.team_name)
 const [name,setName]=useState(item.event.player_name)
 const [minute,setMinute]=useState(item.event.minute == null ? '' : String(item.event.minute))
 const [type,setType]=useState(item.kind==='goal'?item.event.goal_type:item.event.card_type)
 const options=[...new Set([...namesForTeam(team),...(team===item.event.team_name?[item.event.player_name]:[])])]
 useEffect(()=>{const previous=document.activeElement;const element=dialog.current;element?.showModal();return()=>{element?.close();if(previous instanceof HTMLElement)previous.focus()}},[])
 const save=async(e:React.FormEvent)=>{
  e.preventDefault();if(busy.current)return
  if(!match.is_finished||match.is_technical_defeat){setError('Редагування доступне лише для завершеного матчу без технічної поразки.');return}
  if(![match.home_team,match.away_team].includes(team)||!options.includes(name)){setError('Оберіть команду та гравця зі списку.');return}
  busy.current=true;setSaving(true);setError('')
  try{
   const edit={player_name:name,team_name:team,minute:minute===''?null:Number(minute)}
   if(item.kind==='goal')await updateMatchGoal(item.event.id,match.id,{...edit,goal_type:type as MatchGoal['goal_type']})
   else await updateMatchCard(item.event.id,match.id,{...edit,card_type:type as MatchCard['card_type']})
   await onSaved();onClose()
  }catch(cause){setError(cause&&typeof cause==='object'&&'message'in cause?String(cause.message):'Не вдалося оновити подію.')}
  finally{busy.current=false;setSaving(false)}
 }
 return <dialog ref={dialog} aria-labelledby="event-edit-title" onCancel={e=>{e.preventDefault();if(!busy.current)onClose()}} className="fixed inset-0 m-auto max-h-[90dvh] w-[min(94vw,30rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-black/40">
  <form onSubmit={save} className="space-y-4">
   <h3 id="event-edit-title" className="text-lg font-bold">Редагувати {item.kind==='goal'?'гол':'картку'}</h3>
   <fieldset disabled={saving} className="space-y-4">
    <label className="block text-sm">Команда<select className="mt-1 h-10 w-full rounded-lg border px-2" value={team} onChange={e=>{setTeam(e.target.value);setName('')}}>{[match.home_team,match.away_team].map(t=><option key={t}>{t}</option>)}</select></label>
    <label className="block text-sm">Гравець<select required className="mt-1 h-10 w-full rounded-lg border px-2" value={name} onChange={e=>setName(e.target.value)}><option value="">Оберіть гравця</option>{options.map(n=><option key={n}>{n}</option>)}</select></label>
    <label className="block text-sm">Хвилина (необов’язково)<Input className="mt-1" type="number" min="1" max="120" step="1" value={minute} onChange={e=>setMinute(e.target.value)}/></label>
    <label className="block text-sm">Тип події<select className="mt-1 h-10 w-full rounded-lg border px-2" value={type} onChange={e=>setType(e.target.value as typeof type)}>{(item.kind==='goal'?[['regular','Гол'],['penalty','Пенальті'],['own_goal','Автогол']]:[['yellow','Жовта'],['red','Червона'],['yellow_red','Друга жовта → червона']]).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   </fieldset>
   <p className="text-xs text-slate-500">Змінюється наявна подія. Статистика перерахується автоматично.</p>
   {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
   <div className="flex flex-wrap gap-2"><Button type="submit" disabled={saving}>{saving?'Збереження…':'Зберегти зміни'}</Button><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Скасувати</Button></div>
  </form>
 </dialog>
}
