"use client"

import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react"
import { createPortal } from "react-dom"
import { AlertCircle, Check, ChevronLeft, ChevronRight, Download, ImagePlus, LoaderCircle, Palette, RotateCcw, SlidersHorizontal, X } from "lucide-react"
import type { Championship, Match, Team } from "@/lib/supabase"
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
  const uploadRef = useRef<HTMLInputElement>(null)
  const uploadSequence = useRef(0)
  const isMounted = useRef(false)
  const data = useMemo<PosterData>(() => ({ mode, matches, teams, championship }), [mode, matches, teams, championship])
  const [options, setOptions] = useState<PosterOptions>(() => createPosterOptions(data))
  const [rendered, setRendered] = useState<{ options: PosterOptions; data: PosterData; warnings: string[]; error?: string } | null>(null)
  const [uploadError, setUploadError] = useState("")
  const [downloadError, setDownloadError] = useState("")
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const format = POSTER_FORMATS.find((item) => item.id === options.format) || POSTER_FORMATS[0]
  const pages = getPosterPages(data, options)
  const visibleMatches = pages[options.page] || []
  const isRendering = rendered?.options !== options || rendered?.data !== data
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
      uploadSequence.current += 1
      dialog?.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [])

  useEffect(() => {
    const url = options.backgroundUrl
    return () => { if (url?.startsWith("blob:")) URL.revokeObjectURL(url) }
  }, [options.backgroundUrl])

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
    setOptions((previous) => ({ ...previous, [key]: value, ...(key === "format" ? { page: 0 } : {}) }))
    setDownloaded(false)
    setDownloadError("")
  }

  function changePage(direction: number) {
    setOptions((previous) => ({ ...previous, page: Math.max(0, Math.min(getPosterPages(data, previous).length - 1, previous.page + direction)) }))
    setDownloaded(false)
    setDownloadError("")
  }

  async function uploadBackground(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setUploadError("")
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) {
      setUploadError("Оберіть фото у форматі JPG, PNG, WebP або AVIF.")
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError("Фото має бути не більше 15 МБ.")
      return
    }
    const sequence = ++uploadSequence.current
    const url = URL.createObjectURL(file)
    try {
      const image = new window.Image()
      image.src = url
      await image.decode()
      if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 60_000_000) throw new Error("Зменште розмір фото та спробуйте ще раз.")
      if (!isMounted.current || sequence !== uploadSequence.current) { URL.revokeObjectURL(url); return }
      update("backgroundUrl", url)
    } catch {
      URL.revokeObjectURL(url)
      if (isMounted.current && sequence === uploadSequence.current) setUploadError("Не вдалося відкрити фото. Спробуйте інше зображення.")
    }
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
            </div>

            <div className="poster-editor__photo">
              <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(event) => void uploadBackground(event)} />
              <button type="button" className="poster-editor__upload" onClick={() => uploadRef.current?.click()} disabled={downloading}><ImagePlus size={17} /> {options.backgroundUrl ? "Замінити фото тла" : "Додати фото тла"}</button>
              {options.backgroundUrl ? <button type="button" className="poster-editor__remove-photo" onClick={() => { uploadSequence.current += 1; update("backgroundUrl", undefined) }} disabled={downloading}>Прибрати фото</button> : <p>JPG, PNG, WebP, AVIF · до 15 МБ</p>}
              {uploadError && <p className="poster-editor__error" role="alert">{uploadError}</p>}
            </div>

            <button type="button" className="poster-editor__reset" disabled={downloading} onClick={() => { uploadSequence.current += 1; setOptions(createPosterOptions(data)); setUploadError(""); setDownloadError(""); setDownloaded(false) }}><RotateCcw size={13} /> Скинути налаштування</button>
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
