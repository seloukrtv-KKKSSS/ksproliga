"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AlertCircle, Check, ChevronLeft, ChevronRight, Download, LoaderCircle, Palette, RotateCcw, SlidersHorizontal, X } from "lucide-react"
import type { Championship, Match, Team, MatchGoal } from "@/lib/supabase"
import {
  POSTER_FORMATS,
  POSTER_TEMPLATES,
  createPosterOptions,
  getPosterFilename,
  getPosterPages,
  type PosterData,
  type PosterOptions,
} from "@/lib/posters/model"
import { renderPoster } from "@/lib/posters/render"
import "./poster-editor.css"

export interface PosterEditorProps {
  mode: "match" | "round"
  matches: Match[]
  teams: Team[]
  championship?: Championship | null
  onClose: () => void
}

const ACCENTS = ["#f2bd3e", "#0a84ff", "#28a96b", "#ef6b51", "#a78bfa"]

function ImageUrlField({ label, value, onApply, disabled }: { label: string; value: string; onApply: (url: string) => void; disabled: boolean }) {
  const [draft, setDraft] = useState(value)
  const [error, setError] = useState("")
  return <div className="poster-editor__url"><label className="poster-editor__field"><span>{label}</span><input type="url" placeholder="https://…/image.png" value={draft} disabled={disabled} onChange={(event) => { setDraft(event.target.value); setError("") }} /></label><button type="button" className="poster-editor__upload" disabled={disabled} onClick={() => {
    const clean = draft.trim()
    if (clean) { try { const url = new URL(clean); if (url.protocol !== "https:" || url.username || url.password) throw new Error() } catch { setError("Вкажіть пряме HTTPS-посилання на зображення."); return } }
    onApply(clean)
  }}>Застосувати URL</button>{error && <p className="poster-editor__error" role="alert">{error}</p>}</div>
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Не вдалося створити PNG. Спробуйте ще раз.")), "image/png")
  })
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export default function PosterEditor({ mode, matches, teams, championship, onClose }: PosterEditorProps) {
  const titleId = useId()
  const descriptionId = useId()
  const inputId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isMounted = useRef(false)
  const [goalResult, setGoalResult] = useState<{ key: string; goals: MatchGoal[]; error?: boolean } | null>(null)
  const data = useMemo<PosterData>(() => ({ mode, matches, teams, championship, goals: goalResult?.goals || [] }), [mode, matches, teams, championship, goalResult])
  const [options, setOptions] = useState<PosterOptions>(() => createPosterOptions(data))
  const [rendered, setRendered] = useState<{ options: PosterOptions; data: PosterData; warnings: string[]; error?: string } | null>(null)
  const [downloadError, setDownloadError] = useState("")
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const format = POSTER_FORMATS.find((item) => item.id === options.format) || POSTER_FORMATS[0]
  const pages = getPosterPages(data, options)
  const visibleMatches = pages[options.page] || []
  const goalKey = matches.filter((match) => match.is_finished).map((match) => match.id).sort((a,b) => a-b).join(",")
  const loadingGoals = options.showScorers && Boolean(goalKey) && goalResult?.key !== goalKey
  const isRendering = loadingGoals || rendered?.options !== options || rendered?.data !== data
  const canDownload = !isRendering && !rendered?.error && !downloading && matches.length > 0

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    isMounted.current = true
    document.body.style.overflow = "hidden"
    dialog?.showModal()
    return () => {
      isMounted.current = false
      dialog?.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [])

  useEffect(() => {
    if (!options.showScorers || !goalKey || goalResult?.key === goalKey) return
    let cancelled = false
    void import("@/lib/database").then((database) => database.getMatchesGoals(goalKey.split(",").map(Number))).then((goals) => {
      if (!cancelled) setGoalResult({ key: goalKey, goals })
    }).catch(() => { if (!cancelled) setGoalResult({key: goalKey, goals: [], error: true}) })
    return () => { cancelled = true }
  }, [options.showScorers, goalKey, goalResult?.key])

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        await document.fonts.ready
        const nextCanvas = document.createElement("canvas")
        const result = await renderPoster(nextCanvas, data, options)
        if (cancelled || !canvasRef.current) return
        const visibleCanvas = canvasRef.current
        visibleCanvas.width = nextCanvas.width
        visibleCanvas.height = nextCanvas.height
        const context = visibleCanvas.getContext("2d")
        if (!context) throw new Error("Ваш браузер не підтримує створення афіш.")
        context.drawImage(nextCanvas, 0, 0)
        setRendered({ data, options, warnings: result.warnings })
      } catch (error) {
        if (!cancelled) setRendered({ data, options, warnings: [], error: error instanceof Error ? error.message : "Не вдалося створити афішу." })
      }
    }, 100)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [data, options])

  function update<K extends keyof PosterOptions>(key: K, value: PosterOptions[K]) {
    setOptions((previous) => ({ ...previous, [key]: value, ...(["format", "sponsors", "showScorers"].includes(key) ? { page: 0 } : {}) }))
    setDownloaded(false)
    setDownloadError("")
  }

  function changePage(direction: number) {
    setOptions((previous) => ({ ...previous, page: Math.max(0, Math.min(getPosterPages(data, previous).length - 1, previous.page + direction)) }))
    setDownloaded(false)
    setDownloadError("")
  }

  async function download() {
    if (!canDownload || !canvasRef.current) return
    setDownloading(true)
    setDownloadError("")
    try {
      const blob = await canvasToBlob(canvasRef.current)
      saveBlob(blob, getPosterFilename(data, options))
      if (isMounted.current) setDownloaded(true)
    } catch {
      if (isMounted.current) setDownloadError("Не вдалося завантажити PNG. Спробуйте прибрати фото тла або обрати інший шаблон.")
    } finally {
      if (isMounted.current) setDownloading(false)
    }
  }

  if (typeof document === "undefined") return null

  return createPortal(
    <dialog
      ref={dialogRef}
      className="poster-editor"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <div className="poster-editor__shell">
        <header className="poster-editor__header">
          <div className="poster-editor__heading">
            <span className="poster-editor__icon"><Palette size={21} /></span>
            <div>
              <h2 id={titleId}>{mode === "match" ? "Афіша матчу" : "Афіша туру"}</h2>
              <p id={descriptionId}>Ваш футбол. Ваш стиль. Готово для соцмереж.</p>
            </div>
          </div>
          <button className="poster-editor__close" type="button" onClick={onClose} aria-label="Закрити редактор афіш" autoFocus><X size={21} /></button>
        </header>

        <div className="poster-editor__body">
          <div className="poster-editor__controls">
            <div className="poster-editor__section-label"><SlidersHorizontal size={14} /> Оформлення</div>
            <fieldset className="poster-editor__fieldset" disabled={downloading}>
              <legend>Шаблон</legend>
              <div className="poster-editor__templates">
                {POSTER_TEMPLATES.map((template) => (
                  <button key={template.id} type="button" aria-pressed={options.template === template.id} onClick={() => update("template", template.id)} className={`poster-editor__template ${options.template === template.id ? "is-selected" : ""}`} title={template.description}>
                    <span className={`poster-editor__swatch poster-editor__swatch--${template.id}`}><i /><i /><i />{options.template === template.id && <Check size={15} />}</span>
                    <span>{template.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="poster-editor__field" htmlFor={`${inputId}-format`}>
              <span>Формат зображення</span>
              <select id={`${inputId}-format`} value={options.format} onChange={(event) => update("format", event.target.value as PosterOptions["format"])} disabled={downloading}>
                {POSTER_FORMATS.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.width} × {item.height}</option>)}
              </select>
            </label>

            <div className="poster-editor__field">
              <span>Колір акценту</span>
              <div className="poster-editor__colors">
                {ACCENTS.map((color) => <button key={color} type="button" style={{ background: color }} className={options.accent.toLowerCase() === color ? "is-selected" : ""} aria-label={`Колір ${color}`} aria-pressed={options.accent.toLowerCase() === color} onClick={() => update("accent", color)} disabled={downloading}>{options.accent.toLowerCase() === color && <Check size={15} />}</button>)}
                <label className="poster-editor__custom-color" title="Власний колір"><input type="color" value={options.accent} aria-label="Власний колір акценту" onChange={(event) => update("accent", event.target.value)} disabled={downloading} /><span>Свій</span></label>
              </div>
            </div>

            <label className="poster-editor__field" htmlFor={`${inputId}-font`}>
              <span>Шрифт</span>
              <select id={`${inputId}-font`} value={options.font} onChange={(event) => update("font", event.target.value as PosterOptions["font"])} disabled={downloading}>
                <option value="sans">Спортивний</option><option value="condensed">Плакатний</option><option value="serif">Класичний</option>
              </select>
            </label>

            <label className="poster-editor__field" htmlFor={`${inputId}-title`}><span>Заголовок</span><input id={`${inputId}-title`} value={options.title} maxLength={80} onChange={(event) => update("title", event.target.value)} disabled={downloading} /></label>

            <details className="poster-editor__details">
              <summary>Тексти та деталі афіші</summary>
              <div>
                <label className="poster-editor__field" htmlFor={`${inputId}-subtitle`}><span>Підзаголовок</span><input id={`${inputId}-subtitle`} value={options.subtitle} maxLength={150} onChange={(event) => update("subtitle", event.target.value)} disabled={downloading} /></label>
                <label className="poster-editor__field" htmlFor={`${inputId}-venue`}><span>Місце проведення</span><input id={`${inputId}-venue`} placeholder="Назва стадіону або спорткомплексу" value={options.venue} maxLength={120} onChange={(event) => update("venue", event.target.value)} disabled={downloading} /></label>
                <label className="poster-editor__field" htmlFor={`${inputId}-footer`}><span>Підпис унизу</span><input id={`${inputId}-footer`} value={options.footer} maxLength={100} onChange={(event) => update("footer", event.target.value)} disabled={downloading} /></label>
              </div>
            </details>

            <div className="poster-editor__checks">
              <label><input type="checkbox" checked={options.showTime} onChange={(event) => update("showTime", event.target.checked)} disabled={downloading} /> Показувати час матчів</label>
              <label><input type="checkbox" checked={options.showVenue} onChange={(event) => update("showVenue", event.target.checked)} disabled={downloading} /> Показувати місце проведення</label>
              <label><input type="checkbox" checked={options.showScores} onChange={(event) => update("showScores", event.target.checked)} disabled={downloading} /> Рахунки завершених матчів</label>
              <label><input type="checkbox" checked={options.showScorers} onChange={(event) => update("showScorers", event.target.checked)} disabled={downloading} /> Показувати авторів голів</label>
              {options.showScorers && !loadingGoals && <p className="poster-editor__hint">{goalResult?.error ? "Не вдалося завантажити протоколи. Відкрийте редактор ще раз." : data.goals?.length ? "Автори голів із протоколів матчів." : "У протоколах поки немає записаних голів."}</p>}
            </div>

            <details className="poster-editor__details">
              <summary>Тло за URL</summary><div>
                <ImageUrlField key={options.backgroundUrl || "empty"} label="URL зображення тла" value={options.backgroundUrl || ""} disabled={downloading} onApply={(url) => update("backgroundUrl", url || undefined)} />
                <label className="poster-editor__field"><span>Затемнення / висвітлення: {options.backgroundOpacity}%</span><input type="range" min="0" max="100" value={options.backgroundOpacity} disabled={downloading} onChange={(event) => update("backgroundOpacity", Number(event.target.value))} /></label>
                <label className="poster-editor__field"><span>Положення тла: {options.backgroundPosition}%</span><input type="range" min="0" max="100" value={options.backgroundPosition} disabled={downloading} onChange={(event) => update("backgroundPosition", Number(event.target.value))} /></label>
                <p className="poster-editor__hint">Пряме HTTPS-посилання. Файли не завантажуються у сховище сайту. Джерело має дозволяти експорт зображень (CORS).</p>
              </div>
            </details>
            <details className="poster-editor__details">
              <summary>Спонсори ({options.sponsors.length}/8)</summary><div>
                <p className="poster-editor__hint">Головний спонсор — у нижній смузі, менші логотипи — над нею.</p>
                {options.sponsors.map((sponsor, index) => <div key={sponsor.id} className="poster-editor__sponsor">
                  <label className="poster-editor__field"><span>Назва спонсора {index + 1}</span><input maxLength={60} value={sponsor.name} disabled={downloading} onChange={(event) => update("sponsors", options.sponsors.map((item) => item.id === sponsor.id ? { ...item, name: event.target.value } : item))} /></label>
                  <ImageUrlField key={sponsor.url} label={`URL логотипа ${index + 1}`} value={sponsor.url} disabled={downloading} onApply={(url) => update("sponsors", options.sponsors.map((item) => item.id === sponsor.id ? { ...item, url } : item))} />
                  <label className="poster-editor__main-sponsor"><input type="radio" name={`${inputId}-main-sponsor`} checked={options.mainSponsorId === sponsor.id} disabled={downloading} onChange={() => update("mainSponsorId", sponsor.id)} /> Головний спонсор (більше лого)</label>
                  <button type="button" className="poster-editor__remove-photo" disabled={downloading} onClick={() => { update("sponsors", options.sponsors.filter((item) => item.id !== sponsor.id)); if (options.mainSponsorId === sponsor.id) update("mainSponsorId", undefined) }}>Видалити спонсора</button>
                </div>)}
                <button type="button" className="poster-editor__upload" disabled={downloading || options.sponsors.length >= 8} onClick={() => { const id = crypto.randomUUID(); update("sponsors", [...options.sponsors, { id, name: "", url: "" }]); if (!options.mainSponsorId) update("mainSponsorId", id) }}>+ Додати спонсора</button>
              </div>
            </details>

            <button type="button" className="poster-editor__reset" disabled={downloading} onClick={() => { setOptions(createPosterOptions(data)); setDownloadError(""); setDownloaded(false) }}><RotateCcw size={13} /> Скинути налаштування</button>
          </div>

          <section className="poster-editor__preview" aria-label="Попередній перегляд афіші" aria-busy={isRendering}>
            <div className="poster-editor__preview-heading"><span><i /> Попередній перегляд</span><small>{format.width} × {format.height} px</small></div>
            <div className="poster-editor__stage">
              <canvas ref={canvasRef} className="poster-editor__canvas" style={{ aspectRatio: `${format.width} / ${format.height}` }} role="img" aria-label={`${options.title}: ${visibleMatches.map((match) => `${match.home_team} — ${match.away_team}`).join("; ")}`} />
              {isRendering && <div className="poster-editor__rendering" role="status"><LoaderCircle size={22} className="animate-spin" /><span>Готуємо афішу…</span></div>}
              {!isRendering && rendered?.error && <div className="poster-editor__rendering poster-editor__error" role="alert"><AlertCircle size={24} /><span>{rendered.error}</span></div>}
            </div>
            {pages.length > 1 && <div className="poster-editor__pagination"><button type="button" aria-label="Попередня афіша" disabled={options.page === 0 || downloading} onClick={() => changePage(-1)}><ChevronLeft size={17} /></button><span>Афіша {options.page + 1} з {pages.length}<small>Матчів на зображенні: {visibleMatches.length}</small></span><button type="button" aria-label="Наступна афіша" disabled={options.page >= pages.length - 1 || downloading} onClick={() => changePage(1)}><ChevronRight size={17} /></button></div>}
            <p className="poster-editor__preview-note">Час матчів — за Києвом. PNG збережеться в повній якості.</p>
            {!isRendering && rendered && rendered.warnings.length > 0 && <div className="poster-editor__warnings" role="status"><AlertCircle size={15} /><span>{rendered.warnings.join(" ")}</span></div>}
          </section>
        </div>

        <footer className="poster-editor__footer">
          <p>{pages.length > 1 ? `Афіш у цьому турі: ${pages.length}. Перемикайте та завантажуйте кожну.` : "Логотипи, команди та розклад — із вашого турніру."}</p>
          <div>{downloadError && <span className="poster-editor__error" role="alert">{downloadError}</span>}<button type="button" className="poster-editor__download" disabled={!canDownload} onClick={() => void download()}>{downloading || isRendering ? <LoaderCircle size={18} className="animate-spin" /> : downloaded ? <Check size={18} /> : <Download size={18} />}{downloading ? "Зберігаємо…" : downloaded ? "Завантажити ще раз" : pages.length > 1 ? `Завантажити PNG · ${options.page + 1}/${pages.length}` : "Завантажити PNG"}</button></div>
        </footer>
      </div>
    </dialog>, document.body,
  )
}
